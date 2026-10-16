package com.example.mergab.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Visitor {

    @Id
    private Integer id;

    @Column(columnDefinition = "varchar(10) not null unique")
    private String phoneNumber;

    @Column(columnDefinition = "varchar(7) not null")
    private String gender;

    @Column(nullable = false, unique = true, updatable = false)
    private String qrToken;

    // الزائر يختار يشوف أوقات الصلاة أو لا
    @Column(columnDefinition = "boolean not null default false")
    private Boolean showPrayerTimes = false;

    @Column(length = 20)
    private String privacyNoticeVersion;

    @Column
    private LocalDateTime privacyNoticeAcknowledgedAt;

    @OneToOne
    @MapsId
    @JsonIgnore
    private User user;

    @OneToMany(mappedBy = "visitor")
    @JsonIgnore
    private Set<ZoneVisit> zoneVisits;


}
