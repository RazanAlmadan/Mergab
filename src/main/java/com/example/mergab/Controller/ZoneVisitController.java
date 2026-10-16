package com.example.mergab.Controller;


import com.example.mergab.Api.ApiResponse;
import com.example.mergab.DTO.QrScanDTO;
import com.example.mergab.Model.User;
import com.example.mergab.Service.ZoneVisitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/zone-visit")
@RequiredArgsConstructor
public class ZoneVisitController {

    private final ZoneVisitService zoneVisitService;

    // Check in a visitor to a zone by scanning their QR code
    @PostMapping("/check-in/{zoneId}")
    public ResponseEntity<?> checkIn(@PathVariable Integer zoneId, @RequestBody @Valid QrScanDTO dto) {

        zoneVisitService.checkIn(dto.getQrToken(), zoneId);
        return ResponseEntity.status(200).body(new ApiResponse("Visitor checked in successfully"));
    }

    // Check out a visitor from a zone
    @PutMapping("/check-out/{zoneId}")
    public ResponseEntity<?> checkOut(@PathVariable Integer zoneId, @RequestBody @Valid QrScanDTO dto) {

        zoneVisitService.checkOut(dto.getQrToken(), zoneId);
        return ResponseEntity.status(200).body(new ApiResponse("Visitor checked out successfully"));
    }

    // Get the current number of visitors inside a zone
    @GetMapping("/occupancy/{zoneId}")
    public ResponseEntity<?> getCurrentOccupancy(@PathVariable Integer zoneId) {

        return ResponseEntity.status(200).body(zoneVisitService.getCurrentOccupancy(zoneId));
    }



    // Get all visits for a specific visitor
    @GetMapping("/history/{visitorId}")
    public ResponseEntity<?> getVisitorHistory(@PathVariable Integer visitorId) {

        return ResponseEntity.status(200).body(zoneVisitService.getVisitorHistory(visitorId));
    }

    // Get all active visits inside a zone
    @GetMapping("/active/{zoneId}")
    public ResponseEntity<?> getActiveVisits(@PathVariable Integer zoneId) {

        return ResponseEntity.status(200).body(zoneVisitService.getActiveVisits(zoneId));
    }

    // Manually check out a visitor who forgot to check out
    @PutMapping("/manual-check-out")
    public ResponseEntity<?> manualCheckOut(@RequestBody @Valid QrScanDTO dto) {

        zoneVisitService.manualCheckOut(dto.getQrToken());
        return ResponseEntity.status(200).body(new ApiResponse("Visitor manually checked out successfully"));
    }

    // Find the visitor's active zone before confirming manual check-out
    @PostMapping("/active-by-qr")
    public ResponseEntity<?> getActiveVisitByQr(@RequestBody @Valid QrScanDTO dto) {

        return ResponseEntity.status(200).body(zoneVisitService.getActiveVisitByQr(dto.getQrToken()));
    }

    @GetMapping("/my-history")
    public ResponseEntity<?> getMyHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.status(200).body(zoneVisitService.getVisitorHistory(user.getId()));
    }
}