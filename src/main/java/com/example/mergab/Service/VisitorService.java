package com.example.mergab.Service;

import com.example.mergab.Api.ApiException;
import com.example.mergab.DTO.UpdateVisitorDTO;
import com.example.mergab.DTO.VisitorDTO;
import com.example.mergab.Model.User;
import com.example.mergab.Model.Visitor;
import com.example.mergab.Repository.UserRepository;
import com.example.mergab.Repository.VisitorRepository;
import com.example.mergab.Repository.ZoneVisitRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VisitorService {

    private final VisitorRepository visitorRepository;
    private final UserRepository userRepository;
    private final QrCodeService qrCodeService;
    private final ZoneVisitRepository zoneVisitRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllVisitors() {
        return userRepository.findUsersByRole("VISITOR");
    }

    @Transactional
    public String register(VisitorDTO dto) {
        if (userRepository.findUserByEmail(dto.getEmail()) != null) {
            throw new ApiException("Email already exists");
        }
        if (visitorRepository.findVisitorByPhoneNumber(dto.getPhoneNumber()) != null) {
            throw new ApiException("Phone number already exists");
        }

        User user = new User(null, dto.getFullName(), dto.getEmail(), passwordEncoder.encode(dto.getPassword()), "VISITOR", null, null);        userRepository.save(user);

        Visitor visitor = new Visitor();

        visitor.setPhoneNumber(dto.getPhoneNumber());
        visitor.setGender(dto.getGender());
        visitor.setQrToken(UUID.randomUUID().toString());
        visitor.setUser(user);

        visitor.setShowPrayerTimes(Boolean.TRUE.equals(dto.getShowPrayerTimes()));

        if (!Boolean.TRUE.equals(dto.getPrivacyAcknowledged())) {
            throw new ApiException("Privacy acknowledgment is required");
        }

        visitor.setPrivacyNoticeVersion("1.0");
        visitor.setPrivacyNoticeAcknowledgedAt(LocalDateTime.now());


        user.setVisitor(visitor);
        visitorRepository.save(visitor);

        return visitor.getQrToken();
    }

    @Transactional
    public void updateVisitor(Integer visitorId, UpdateVisitorDTO dto) {
        Visitor visitor = visitorRepository.findVisitorById(visitorId);

        if (visitor == null) {
            throw new ApiException("Visitor not found");
        }

        Visitor phoneOwner = visitorRepository.findVisitorByPhoneNumber(dto.getPhoneNumber());

        if (phoneOwner != null && !phoneOwner.getId().equals(visitorId)) {
            throw new ApiException("Phone number already exists");
        }

        visitor.setPhoneNumber(dto.getPhoneNumber());
        visitor.setGender(dto.getGender());
        visitor.setShowPrayerTimes(Boolean.TRUE.equals(dto.getShowPrayerTimes()));

        visitorRepository.save(visitor);
    }




    // Generate the visitor's QR code image
    public byte[] getVisitorQrCode(Integer visitorId) {

        Visitor visitor = visitorRepository.findVisitorById(visitorId);

        if (visitor == null) {
            throw new ApiException("Visitor not found");
        }

        return qrCodeService.generateQrCode(visitor.getQrToken());
    }

}
