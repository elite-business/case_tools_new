package com.elite.casetools.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

/**
 * JWT authentication filter
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        // Skip JWT validation for PUBLIC auth endpoints only
        String path = request.getRequestURI();
        log.debug("JWT Filter processing request - Path: {}, Method: {}", path, request.getMethod());
        
        // Only skip JWT validation for truly public endpoints (login, refresh, register)
        // The /auth/me endpoint requires authentication
        if ((path.equals("/api/auth/login") || path.equals("/auth/login") ||
             path.equals("/api/auth/refresh") || path.equals("/auth/refresh") ||
             path.equals("/api/auth/register") || path.equals("/auth/register")) || 
            path.equals("/api/health") || path.equals("/health") || 
            path.equals("/api/test") || path.equals("/test") || 
            path.startsWith("/api/actuator/") || path.startsWith("/actuator/") || 
            path.startsWith("/api/swagger") || path.startsWith("/swagger") ||
            path.startsWith("/api/v3/api-docs") || path.startsWith("/v3/api-docs") ||
            path.startsWith("/api/swagger-ui") || path.startsWith("/swagger-ui") ||
            path.equals("/api/error") || path.equals("/error") ||
            path.startsWith("/api/webhooks/") || path.startsWith("/webhooks/")) {
            log.debug("Skipping JWT validation for public path: {}", path);
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            String jwt = getJwtFromRequest(request);
            
            if (!StringUtils.hasText(jwt)) {
                log.warn("No JWT token found in request for path: {}", path);
                filterChain.doFilter(request, response);
                return;
            }
            
            log.debug("Found JWT token, validating...");
            
            if (!tokenProvider.validateToken(jwt)) {
                log.warn("JWT token validation failed for path: {}", path);
                filterChain.doFilter(request, response);
                return;
            }

            String username = tokenProvider.getUsernameFromToken(jwt);
            String authorities = tokenProvider.getAuthoritiesFromToken(jwt);
            
            log.debug("JWT token valid. Username: {}, Authorities: {}", username, authorities);

            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            
            // Parse authorities from token
            List<SimpleGrantedAuthority> grantedAuthorities = Arrays.stream(authorities.split(","))
                    .filter(auth -> !auth.isEmpty())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());

            UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, grantedAuthorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            log.info("Successfully set authentication for user: {} with authorities: {}", username, grantedAuthorities);
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from request header
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}