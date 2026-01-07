package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.Team;
import com.elite.casetools.entity.User;
import com.elite.casetools.repository.TeamRepository;
import com.elite.casetools.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for team management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    /**
     * Get all teams with pagination
     */
    @Transactional(readOnly = true)
    public Page<TeamResponse> getAllTeams(Pageable pageable, String search) {
        log.info("Getting all teams with search: {}", search);
        
        Page<Team> teamPage;
        if (search == null || search.trim().isEmpty()) {
            teamPage = teamRepository.findAll(pageable);
        } else {
            teamPage = teamRepository.findBySearchTerm(search, pageable);
        }
        
        // Initialize lazy collections
        teamPage.getContent().forEach(team -> {
            if (team.getMembers() != null) {
                team.getMembers().size(); // Force initialization
            }
        });
        
        return teamPage.map(this::mapToResponseWithMembers);
    }

    /**
     * Get team by ID
     */
    @Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        log.info("Getting team by ID: {}", id);
        
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));
                
        return mapToResponseWithMembers(team);
    }

    /**
     * Create new team
     */
    public TeamResponse createTeam(CreateTeamRequest request, String username) {
        log.info("Creating new team {} by user: {}", request.getName(), username);
        
        User leader = null;
        if (request.getLeadId() != null) {
            leader = userRepository.findById(request.getLeadId())
                    .orElseThrow(() -> new RuntimeException("Leader user not found with id: " + request.getLeadId()));
        }
        
        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .leader(leader)
                .department(request.getDepartment())
                .location(request.getLocation())
                .contactEmail(request.getContactEmail())
                .phone(request.getPhone())
                .specialization(request.getSpecialization())
                .active(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
                
        // Add members if provided
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            for (Long memberId : request.getMemberIds()) {
                try {
                    User member = userRepository.findById(memberId).orElse(null);
                    if (member != null) {
                        team.addMember(member);
                        log.info("Adding member {} to team {}", memberId, team.getName());
                    }
                } catch (Exception e) {
                    log.warn("Could not add member {} to team: {}", memberId, e.getMessage());
                }
            }
        }
        
        Team savedTeam = teamRepository.save(team);
        
        // Re-fetch with members to ensure they're loaded
        savedTeam = teamRepository.findByIdWithMembers(savedTeam.getId()).orElse(savedTeam);
        
        return mapToResponseWithMembers(savedTeam);
    }

    /**
     * Update team
     */
    @Transactional
    public TeamResponse updateTeam(Long id, UpdateTeamRequest request, String username) {
        log.info("Updating team {} by user: {}", id, username);
        
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));
        
        // Update fields if provided
        if (request.getName() != null) {
            team.setName(request.getName());
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        if (request.getLeadId() != null) {
            User leader = userRepository.findById(request.getLeadId())
                    .orElseThrow(() -> new RuntimeException("Leader user not found with id: " + request.getLeadId()));
            team.setLeader(leader);
        }
        if (request.getDepartment() != null) {
            team.setDepartment(request.getDepartment());
        }
        if (request.getLocation() != null) {
            team.setLocation(request.getLocation());
        }
        if (request.getContactEmail() != null) {
            team.setContactEmail(request.getContactEmail());
        }
        if (request.getPhone() != null) {
            team.setPhone(request.getPhone());
        }
        if (request.getSpecialization() != null) {
            team.setSpecialization(request.getSpecialization());
        }
        if (request.getIsActive() != null) {
            team.setActive(request.getIsActive());
        }
        
        Team savedTeam = teamRepository.save(team);
        
        // Re-fetch with members
        savedTeam = teamRepository.findByIdWithMembers(savedTeam.getId()).orElse(savedTeam);
        
        return mapToResponseWithMembers(savedTeam);
    }

    /**
     * Delete team
     */
    @Transactional
    public void deleteTeam(Long id) {
        log.info("Deleting team: {}", id);
        
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));
        
        // Soft delete by setting inactive
        team.setActive(false);
        teamRepository.save(team);
    }

    /**
     * Add member to team
     */
    public TeamMemberResponse addMember(Long teamId, AddTeamMemberRequest request, String username) {
        log.info("Adding member {} to team {} by user: {}", 
                request.getUserId(), teamId, username);
        
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));
        
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));
        
        // Add user to team members
        if (!team.getMembers().contains(user)) {
            team.addMember(user);
            teamRepository.save(team);
        }
        
        return mapUserToMemberResponse(user);
    }

    /**
     * Remove member from team
     */
    public void removeMember(Long teamId, Long userId) {
        log.info("Removing member {} from team {}", userId, teamId);
        
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        team.removeMember(user);
        teamRepository.save(team);
    }

    /**
     * Update member role
     */
    @Transactional
    public TeamMemberResponse updateMemberRole(Long teamId, Long userId, UpdateTeamMemberRoleRequest request, String username) {
        log.info("Updating member {} role to {} in team {} by user: {}", 
                userId, request.getRole(), teamId, username);
        
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));
        
        User user = team.getMembers().stream()
                .filter(m -> m.getId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("User " + userId + " is not a member of team " + teamId));
        
        // Since we don't have team-specific roles in the current model,
        // we just return the member with the requested role
        // In a real app, you might want to create a TeamMember entity with role
        
        return mapUserToMemberResponse(user);
    }

    /**
     * Get team performance
     */
    @Transactional(readOnly = true)
    public TeamPerformanceResponse.TeamPerformanceData getTeamPerformance(Long teamId, String period) {
        log.info("Getting team performance for team {} and period: {}", teamId, period);
        
        Team team = teamRepository.findByIdWithMembers(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));
        
        // Calculate performance metrics (simplified version)
        // In a real app, you would query the case management tables
        List<TeamPerformanceResponse.UserPerformanceData> memberPerformance = new ArrayList<>();
        
        for (User member : team.getMembers()) {
            memberPerformance.add(TeamPerformanceResponse.UserPerformanceData.builder()
                    .userId(member.getId())
                    .userName(member.getName())
                    .casesHandled(0L) // Would query actual case count
                    .casesResolved(0L) // Would query resolved cases
                    .averageResolutionTime(0.0) // Would calculate from case data
                    .slaCompliance(100.0) // Would calculate from case data
                    .build());
        }
        
        return TeamPerformanceResponse.TeamPerformanceData.builder()
                .teamId(teamId)
                .teamName(team.getName())
                .totalCases(0L) // Would query actual total
                .resolvedCases(0L) // Would query resolved total
                .openCases(0L) // Would query open cases
                .averageResolutionTime(0.0) // Would calculate average
                .slaCompliance(100.0) // Would calculate compliance
                .membersCount((long) team.getMembers().size())
                .members(memberPerformance)
                .build();
    }

    // Helper methods

    private TeamResponse mapToResponse(Team team) {
        UserSummaryDto leaderDto = null;
        if (team.getLeader() != null) {
            leaderDto = UserSummaryDto.builder()
                    .id(team.getLeader().getId())
                    .name(team.getLeader().getName())
                    .email(team.getLeader().getEmail())
                    .role(team.getLeader().getRole() != null ? team.getLeader().getRole().name() : null)
                    .build();
        }
        
        int memberCount = team.getMembers() != null ? team.getMembers().size() : 0;
        
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .leader(leaderDto)
                .department(team.getDepartment())
                .location(team.getLocation())
                .contactEmail(team.getContactEmail())
                .phone(team.getPhone())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .active(team.getActive())
                .memberCount(memberCount)
                .specialization(team.getSpecialization())
                .build();
    }
    
    private TeamResponse mapToResponseWithMembers(Team team) {
        TeamResponse response = mapToResponse(team);
        
        if (team.getMembers() != null) {
            List<TeamMemberResponse> memberResponses = team.getMembers().stream()
                    .map(this::mapUserToMemberResponse)
                    .toList();
                    
            response.setMembers(memberResponses);
        }
        return response;
    }
    
    private TeamMemberResponse mapUserToMemberResponse(User user) {
        UserSummaryDto userDto = UserSummaryDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .build();
        
        return TeamMemberResponse.builder()
                .id(user.getId())
                .user(userDto)
                .username(user.getLogin())
                .fullName(user.getName())
                .email(user.getEmail())
                .role("MEMBER")
                .joinedAt(LocalDateTime.now())
                .updatedAt(user.getUpdatedAt())
                .active(user.getStatus() == User.UserStatus.ACTIVE)
                .specialization(user.getDepartment()) // Use department as specialization
                .build();
    }

    /**
     * Get all active teams
     */
    @Transactional(readOnly = true)
    public List<Team> getActiveTeams() {
        log.info("Getting all active teams");
        return teamRepository.findByActiveTrue();
    }
}