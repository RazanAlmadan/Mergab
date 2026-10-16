package com.example.mergab.DTO;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VisitorDTO {

    @NotEmpty(message = "Full name is required")
    @Size(min = 3, max = 50, message = "Full name must be between 3 and 50 characters")
    private String fullName;

    @NotEmpty(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotEmpty(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotEmpty(message = "Phone number is required")
    @Pattern(regexp = "^05\\d{8}$", message = "Phone number must start with 05 and be 10 digits")
    private String phoneNumber;

    @NotEmpty(message = "Gender is required")
    @Pattern(regexp = "MALE|FEMALE", message = "Gender must be MALE or FEMALE")
    private String gender;

    private Boolean showPrayerTimes = false;

    @NotNull(message = "Privacy acknowledgment is required")
    @AssertTrue(message = "Privacy policy must be acknowledged")
    private Boolean privacyAcknowledged;
}
