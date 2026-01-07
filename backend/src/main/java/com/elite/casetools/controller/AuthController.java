package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.dto.UserPermissionsResponse;
import com.elite.casetools.entity.User;
import com.elite.casetools.security.JwtTokenProvider;
import com.elite.casetools.service.UserService;
import com.elite.casetools.service.RoleBasedAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for authentication operations
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final RoleBasedAccessService rbacService;

    /**
     * Login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("Login attempt for user: {}", loginRequest.getUsername());
        
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate tokens
            String jwt = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication.getName());

            // Get user details
            User user = (User) authentication.getPrincipal();
            
            // Update successful login
            userService.handleSuccessfulLogin(user.getLogin());
            userService.updateLastLogin(user.getId());

            // Build response
            LoginResponse.UserResponse userResponse = LoginResponse.UserResponse.builder()
                    .id(user.getId())
                    .username(user.getLogin())
                    .email(user.getEmail())
                    .name(user.getName())
                    .role(user.getRole() != null ? user.getRole().name() : null)
                    .authorities(authentication.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .collect(Collectors.toList()))
                    .department(user.getDepartment())
                    .active(user.isEnabled())
                    .build();

            LoginResponse response = LoginResponse.builder()
                    .token(jwt)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(3600000L) // 1 hour in milliseconds
                    .user(userResponse)
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Login failed for user: {}", loginRequest.getUsername(), e);
            //userService.handleFailedLogin(loginRequest.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Refresh token endpoint
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            String refreshToken = request.getRefreshToken();
            
            if (tokenProvider.validateToken(refreshToken)) {
                String username = tokenProvider.getUsernameFromToken(refreshToken);
                User user = userService.getUserByLogin(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                
                // Create authentication from user
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        user, 
                        null, 
                        user.getAuthorities()
                );
                
                // Generate new access token
                String newToken = tokenProvider.generateToken(authentication);
                
                TokenRefreshResponse response = TokenRefreshResponse.builder()
                        .token(newToken)
                        .tokenType("Bearer")
                        .expiresIn(3600000L) // 1 hour
                        .build();
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        } catch (Exception e) {
            log.error("Token refresh failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Get current user endpoint
     */
    @GetMapping("/me")
    public ResponseEntity<LoginResponse.UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        User user = (User) authentication.getPrincipal();
        
        LoginResponse.UserResponse userResponse = LoginResponse.UserResponse.builder()
                .id(user.getId())
                .username(user.getLogin())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .authorities(authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList()))
                .department(user.getDepartment())
                .active(user.isEnabled())
                .build();
        
        return ResponseEntity.ok(userResponse);
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    /**
     * Register new user (public endpoint for initial setup)
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse.UserResponse> register(@Valid @RequestBody CreateUserRequest request) {
        log.info("Registering new user: {}", request.getLogin());
        
        try {
            User newUser = userService.createUser(request);
            
            LoginResponse.UserResponse userResponse = LoginResponse.UserResponse.builder()
                    .id(newUser.getId())
                    .username(newUser.getLogin())
                    .email(newUser.getEmail())
                    .name(newUser.getName())
                    .role(newUser.getRole() != null ? newUser.getRole().name() : null)
                    .authorities(newUser.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .collect(Collectors.toList()))
                    .department(newUser.getDepartment())
                    .active(newUser.isEnabled())
                    .build();
            
            return ResponseEntity.status(HttpStatus.CREATED).body(userResponse);
        } catch (Exception e) {
            log.error("Registration failed for user: {}", request.getLogin(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Change password endpoint
     */
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        User user = (User) authentication.getPrincipal();
        
        try {
            userService.changePassword(user.getId(), request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Get user permissions for RBAC
     */
    @GetMapping("/permissions")
    public ResponseEntity<UserPermissionsResponse> getUserPermissions(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        User user = (User) authentication.getPrincipal();
        
        UserPermissionsResponse response = UserPermissionsResponse.builder()
                .navigation(rbacService.getNavigationPermissions(user))
                .actions(rbacService.getActionPermissions(user))
                .dataFilters(rbacService.getDataFilters(user))
                .isAdmin(rbacService.isAdmin(user))
                .isManager(rbacService.isManager(user))
                .build();
        
        return ResponseEntity.ok(response);
    }
}