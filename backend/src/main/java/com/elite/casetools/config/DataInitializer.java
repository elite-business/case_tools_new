package com.elite.casetools.config;

import com.elite.casetools.entity.User;
import com.elite.casetools.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Data initializer to create default admin user and system settings
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        createAdminUser();
    }

    /**
     * Create default admin user if it doesn't exist
     */
    private void createAdminUser() {
        try {
            // Check if admin user already exists
            if (userRepository.findByLogin("admin").isEmpty()) {
                log.info("Creating default admin user...");
                
                User adminUser = User.builder()
                        .name("Administrator")
                        .login("admin")
                        .email("admin@elite.com")
                        .password(passwordEncoder.encode("admin123"))
                        .matricule("ADMIN001")
                        .role(User.UserRole.ADMIN)
                        .status(User.UserStatus.ACTIVE)
                        .department("IT Administration")
                        .phone("+1-555-0000")
                        .createdBy("SYSTEM")
                        // Grant all permissions to admin
                        .domainControl(true)
                        .revenueStream(true)
                        .historiqueAlert(true)
                        .adminAdd(true)
                        .raRule(true)
                        .stat(true)
                        .assignedTo(true)
                        .reAssignedTo(true)
                        .closed(true)
                        .failedLoginAttempts(0)
                        .build();
                
                // Set creation timestamp manually since we're using builder
                adminUser.setCreatedAt(LocalDateTime.now());
                adminUser.setUpdatedAt(LocalDateTime.now());
                
                userRepository.save(adminUser);
                log.info("Default admin user created successfully with username: admin and password: admin123");
            } else {
                log.info("Admin user already exists, skipping creation");
                
                // Ensure the existing admin user has the correct password hash
                User existingAdmin = userRepository.findByLogin("admin").get();
                String expectedHash = "$2a$10$.Os1B/Lhxb42BtW6eB/nOeyq2kFQc5u4YE4WIvMIzmDt4wqheEHPa";
                
                if (!expectedHash.equals(existingAdmin.getPassword())) {
                    log.info("Updating admin user password to match expected hash");
                    existingAdmin.setPassword(expectedHash);
                    existingAdmin.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(existingAdmin);
                    log.info("Admin user password updated successfully");
                }
            }
        } catch (Exception e) {
            log.error("Error initializing admin user", e);
        }
    }
}