package com.example.mergab.Repository;

import com.example.mergab.Model.PrayerAlertLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface PrayerAlertLogRepository extends JpaRepository<PrayerAlertLog, Integer> {

    boolean existsByVisitor_IdAndPrayerDateAndPrayerKey(Integer visitorId, LocalDate prayerDate, String prayerKey);
    @Modifying
    @Query("DELETE FROM PrayerAlertLog p WHERE p.visitor.id = :visitorId")
    int deleteLogsByVisitorId(@Param("visitorId") Integer visitorId);
}
