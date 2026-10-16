package com.example.mergab.Service;

import com.example.mergab.Api.ApiException;
import com.example.mergab.Model.ExpoEvent;
import com.example.mergab.Model.Simulation;
import com.example.mergab.Model.User;
import com.example.mergab.Repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

// عمليات الأدمن على كل المستخدمين
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final VisitorRepository visitorRepository;
    private final ExpoEventRepository expoEventRepository;
    private final SimulationRepository simulationRepository;
    private final ZoneVisitRepository zoneVisitRepository;
    private final PasswordEncoder passwordEncoder;
    private final PrayerAlertLogRepository prayerAlertLogRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;


    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Integer id) {
        User user = userRepository.findUserById(id);
        if (user == null) {
            throw new ApiException("User not found");
        }
        return user;
    }

    public List<User> getUsersByRole(String role) {
        if (role == null || !role.matches("(?i)^(ADMIN|ORGANIZER|VISITOR)$")) {
            throw new ApiException("Role must be ADMIN, ORGANIZER or VISITOR");
        }

        role = role.toUpperCase();
        return userRepository.findUsersByRole(role);
    }

    public void addAdmin(User admin) {
        if (userRepository.findUserByEmail(admin.getEmail()) != null) {
            throw new ApiException("Email already exists");
        }

        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        admin.setRole("ADMIN");
        admin.setOrganizer(null);
        admin.setVisitor(null);

        userRepository.save(admin);
    }

    @Transactional
    public void deleteUser(Integer id) {
        User user = getUserById(id);

        if ("ORGANIZER".equals(user.getRole())) {

            // Keep events and simulations, but remove their organizer reference
            for (ExpoEvent event : expoEventRepository.findExpoEventsByOrganizer_Id(id)) {
                event.setOrganizer(null);
                expoEventRepository.save(event);
            }

            for (Simulation simulation : simulationRepository.findSimulationsByOrganizer_Id(id)) {
                simulation.setOrganizer(null);
                simulationRepository.save(simulation);
            }

            // Delete organizer profile before deleting the user account
            user.setOrganizer(null);
            organizerRepository.deleteById(id);
            organizerRepository.flush();
        }

        if ("VISITOR".equals(user.getRole())) {

            // Remove personal visit history
            zoneVisitRepository.deleteVisitsByVisitorId(id);

            // Remove prayer alert history
            prayerAlertLogRepository.deleteLogsByVisitorId(id);

            // Remove password reset records
            passwordResetCodeRepository.deleteByUser_Id(id);

            // Remove visitor profile
            user.setVisitor(null);
            visitorRepository.deleteById(id);
            visitorRepository.flush();
        }

        // Delete the user account (ADMIN, ORGANIZER, or VISITOR)
        userRepository.delete(user);
    }

    public void updateMyAccount(Integer userId, String fullName, String email) {
        User user = getUserById(userId);

        if (fullName == null || fullName.isBlank()
                || fullName.length() < 3 || fullName.length() > 50) {
            throw new ApiException("Full name must be between 3 and 50 characters");
        }

        if (email == null || !email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new ApiException("Invalid email");
        }

        User existingUser = userRepository.findUserByEmail(email);

        if (existingUser != null && !existingUser.getId().equals(userId)) {
            throw new ApiException("Email already exists");
        }

        user.setFullName(fullName);
        user.setEmail(email);

        userRepository.save(user);
    }


    public void changePassword(Integer userId, String oldPassword, String newPassword) {

        User user = getUserById(userId);

        if (oldPassword == null || oldPassword.isBlank()) {
            throw new ApiException("Old password is required");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new ApiException("Wrong old password");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new ApiException("New password must be at least 6 characters");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ApiException("New password must be different from old password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
