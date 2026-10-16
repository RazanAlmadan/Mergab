package com.example.mergab.Service;

import com.example.mergab.Api.ApiException;
import com.example.mergab.DTO.PrayerAlertDTO;
import com.example.mergab.DTO.PrayerRoomDTO;
import com.example.mergab.Model.*;
import com.example.mergab.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * تنبيه قبل الأذان:
 * 1. الزائر لازم يكون مفعّل "عرض أوقات الصلاة" (showPrayerTimes)
 * 2. الأذان بعد 10 دقائق أو أقل، ومو وقت الصلاة نفسها
 * 3. مرة وحدة لكل صلاة في اليوم (PrayerAlertLog)
 * 4. مكان الزائر: المنطقة اللي داخلها بالـ QR، وإلا المنطقة اللي يرسلها الفرونت
 * 5. أقرب مصلى رجال وأقرب مصلى نساء (من Facility نوعها PRAYER_ROOM) بأهدأ طريق (Dijkstra على ZoneConnection،
 *    والمنطقة المزدحمة تكلّف أكثر عشان الطريق يتجنبها)
 */
@Service
@RequiredArgsConstructor
public class PrayerAlertService {

    private static final int ALERT_MINUTES = 10;
    private static final ZoneId RIYADH = ZoneId.of("Asia/Riyadh");
    private static final List<String> PRAYERS = List.of("fajr", "dhuhr", "asr", "maghrib", "isha");

    private final PrayerTimesService prayerTimesService;
    private final VisitorRepository visitorRepository;
    private final ZoneRepository zoneRepository;
    private final ZoneVisitRepository zoneVisitRepository;
    private final ZoneConnectionRepository zoneConnectionRepository;
    private final FacilityRepository facilityRepository;
    private final PrayerAlertLogRepository prayerAlertLogRepository;

    public PrayerAlertDTO getAlert(Integer visitorId, Integer fromZoneId, String simulateTime) {
        Visitor visitor = visitorRepository.findVisitorById(visitorId);
        if (visitor == null) {
            throw new ApiException("Visitor not found");
        }
        validateTime(simulateTime);

        PrayerAlertDTO alert = new PrayerAlertDTO();
        alert.setShow(false);

        // 1) ما فعّل أوقات الصلاة → ما نطلع له شي
        if (!Boolean.TRUE.equals(visitor.getShowPrayerTimes())) {
            return alert;
        }

        // 2) كم باقي على الأذان؟
        Map<String, Object> today = prayerTimesService.getToday(simulateTime);
        Map<?, ?> next = (Map<?, ?>) today.get("nextPrayer");
        String prayerKey = (String) next.get("key");
        int minutesLeft = ((Number) next.get("minutesLeft")).intValue();
        alert.setPrayer(prayerKey);
        alert.setTime((String) next.get("time"));
        alert.setMinutesLeft(minutesLeft);

        if (today.get("currentPrayer") != null || minutesLeft <= 0 || minutesLeft > ALERT_MINUTES) {
            return alert;
        }

        // 3) شافه قبل؟ (وضع التجربة simulateTime يطلع كل مرة عشان العرض)
        if (simulateTime == null && prayerAlertLogRepository
                .existsByVisitor_IdAndPrayerDateAndPrayerKey(visitorId, LocalDate.now(RIYADH), prayerKey)) {
            return alert;
        }

        // 4) وين الزائر؟ لو داخل منطقة بالـ QR نستخدمها، وإلا اللي أرسلها الفرونت
        Integer from = fromZoneId;
        ZoneVisit activeVisit = zoneVisitRepository.findByVisitor_IdAndCheckOutTimeIsNull(visitorId);
        if (activeVisit != null) {
            from = activeVisit.getZone().getId();
        } else if (from != null && zoneRepository.findZoneById(from) == null) {
            throw new ApiException("Zone not found");
        }
        alert.setFromZoneId(from);

        // 5) أقرب مصلى لكل جنس
        Map<Integer, Double> cost = from == null ? null : crowdAwareCosts(from);
        alert.setMen(nearest("MALE", cost));
        alert.setWomen(nearest("FEMALE", cost));
        alert.setShow(alert.getMen() != null || alert.getWomen() != null);
        return alert;
    }

    // الفرونت يناديها لما الزائر يشوف التنبيه → ما يطلع له مرة ثانية لنفس الصلاة
    public void markSeen(Integer visitorId, String prayerKey) {
        Visitor visitor = visitorRepository.findVisitorById(visitorId);
        if (visitor == null) {
            throw new ApiException("Visitor not found");
        }
        if (!PRAYERS.contains(prayerKey)) {
            throw new ApiException("Invalid prayer");
        }
        LocalDate today = LocalDate.now(RIYADH);
        if (prayerAlertLogRepository.existsByVisitor_IdAndPrayerDateAndPrayerKey(visitorId, today, prayerKey)) {
            return;
        }
        prayerAlertLogRepository.save(new PrayerAlertLog(null, visitor, today, prayerKey, LocalDateTime.now(RIYADH)));
    }

    // ===== helpers =====

    private void validateTime(String time) {
        if (time != null && !time.matches("^([01]\\d|2[0-3]):[0-5]\\d$")) {
            throw new ApiException("simulateTime must be in HH:mm format");
        }
    }

    // كل ما زادت زحمة المنطقة، صار المرور فيها "أطول"
    private double crowdFactor(Zone zone) {
        double r = occupancyRatio(zone);
        if (r >= 0.9) return 4;
        if (r >= 0.75) return 2.5;
        if (r >= 0.5) return 1.3;
        return 1;
    }

    // Dijkstra: تكلفة الوصول لكل منطقة من منطقة الزائر
    // الممرات نعاملها في الاتجاهين لأن الزائر يقدر يمشي رايح وجاي
    private Map<Integer, Double> crowdAwareCosts(Integer fromZoneId) {
        Map<Integer, List<Zone>> neighbours = new HashMap<>();
        for (ZoneConnection c : zoneConnectionRepository.findAll()) {
            neighbours.computeIfAbsent(c.getFromZone().getId(), k -> new ArrayList<>()).add(c.getToZone());
            neighbours.computeIfAbsent(c.getToZone().getId(), k -> new ArrayList<>()).add(c.getFromZone());
        }

        Map<Integer, Double> cost = new HashMap<>();
        PriorityQueue<Map.Entry<Integer, Double>> queue =
                new PriorityQueue<>(Map.Entry.comparingByValue());
        cost.put(fromZoneId, 0.0);
        queue.add(Map.entry(fromZoneId, 0.0));

        while (!queue.isEmpty()) {
            Map.Entry<Integer, Double> current = queue.poll();
            int zoneId = current.getKey();
            if (current.getValue() > cost.get(zoneId)) continue;   // لقينا طريق أرخص قبل

            for (Zone next : neighbours.getOrDefault(zoneId, List.of())) {
                double newCost = current.getValue() + crowdFactor(next);
                if (newCost < cost.getOrDefault(next.getId(), Double.MAX_VALUE)) {
                    cost.put(next.getId(), newCost);
                    queue.add(Map.entry(next.getId(), newCost));
                }
            }
        }
        return cost;
    }

    // أقرب مصلى لجنس معيّن (MALE أو FEMALE + المصليات المشتركة BOTH).
    // لو ما نعرف مكان الزائر (cost = null) نختار الأهدأ
    private PrayerRoomDTO nearest(String gender, Map<Integer, Double> cost) {
        List<Facility> rooms = facilityRepository
                .findFacilitiesByTypeAndGenderIn("PRAYER_ROOM", List.of(gender, "BOTH"));
        Facility best = null;
        double bestScore = Double.MAX_VALUE;
        for (Facility room : rooms) {
            Zone zone = room.getZone();
            double ratio = occupancyRatio(zone);
            double score = (cost == null || !cost.containsKey(zone.getId()))
                    ? 1000 + ratio                              // ما فيه طريق معروف → آخر خيار
                    : cost.get(zone.getId()) + ratio;           // الزحمة تفرّق بين المتساويين
            if (score < bestScore) {
                bestScore = score;
                best = room;
            }
        }
        return best == null ? null : toDTO(best);
    }

    // نسبة الإشغال: 0.0 → 1.0
    private double occupancyRatio(Zone zone) {
        if (zone.getCapacity() == null || zone.getCapacity() <= 0) {
            return 0;
        }

        long current = zoneVisitRepository.countByZone_IdAndCheckOutTimeIsNull(zone.getId());

        return (double) current / zone.getCapacity();
    }

    // نفس مستويات الزحمة اللي في الفرونت
    private static String crowdLevel(double ratio) {
        if (ratio >= 0.9) return "CRITICAL";
        if (ratio >= 0.75) return "HIGH";
        if (ratio >= 0.5) return "MEDIUM";
        return "LOW";
    }

    private PrayerRoomDTO toDTO(Facility room) {
        Zone zone = room.getZone();
        double ratio = occupancyRatio(zone);
        return new PrayerRoomDTO(
                room.getId(),
                room.getName(),
                room.getGender(),
                zone.getId(),
                zone.getName(),
                room.getMapX(),
                room.getMapY(),
                (int) Math.round(ratio * 100),
                crowdLevel(ratio)
        );
    }
}
