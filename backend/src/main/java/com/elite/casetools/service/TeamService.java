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
    private final TeamPerformanceService teamPerformanceService;

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
            teamPage = teamRepository.findAll(pageable);
        }
        
        // Initialize lazy collections
        teamPage.getContent().forEach(team -> {
            if (team.getMembers() != null) {
                team.getMembers().size();
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
                .lead(leader)
                .department(request.getDepartment())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
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
        
        savedTeam = teamRepository.findById(savedTeam.getId()).orElse(savedTeam);
        
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
            team.setLead(leader);
        }
        if (request.getDepartment() != null) {
            team.setDepartment(request.getDepartment());
        }
        if (request.getIsActive() != null) {
            team.setIsActive(request.getIsActive());
        }
        
        Team savedTeam = teamRepository.save(team);
        
        // Re-fetch with members
        savedTeam = teamRepository.findById(savedTeam.getId()).orElse(savedTeam);
        
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
        team.setIsActive(false);
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
        
        return mapUserToMemberResponse(user);
    }

    /**
     * Get team performance
     */
    @Transactional(readOnly = true)
    public TeamPerformanceResponse.TeamPerformanceData getTeamPerformance(Long teamId, String period) {
        log.info("Getting team performance for team {} and period: {}", teamId, period);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));

        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = switch (period != null ? period : "30d") {
            case "7d" -> endDate.minusDays(7);
            case "90d" -> endDate.minusDays(90);
            default -> endDate.minusDays(30);
        };

        TeamPerformance performance = teamPerformanceService.calculateTeamPerformance(teamId, startDate, endDate);
        return mapPerformanceToSummary(performance, team.getMembers());
    }

    // Helper methods

    private TeamResponse mapToResponse(Team team) {
        UserSummaryDto leaderDto = null;
        if (team.getLead() != null) {
            leaderDto = UserSummaryDto.builder()
                    .id(team.getLead().getId())
                    .name(team.getLead().getName())
                    .fullName(team.getLead().getName())
                    .username(team.getLead().getLogin())
                    .email(team.getLead().getEmail())
                    .login(team.getLead().getLogin())
                    .role(team.getLead().getRole() != null ? team.getLead().getRole().name() : null)
                    .department(team.getLead().getDepartment())
                    .build();
        }
        
        int memberCount = team.getMembers() != null ? team.getMembers().size() : 0;
        
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .leader(leaderDto)
                .lead(leaderDto)
                .department(team.getDepartment())
                .location(null)
                .contactEmail(null)
                .phone(null)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .active(team.getIsActive())
                .isActive(team.getIsActive())
                .memberCount(memberCount)
                .specialization(null) 
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
        response.setPerformance(buildTeamPerformanceSummary(team));
        return response;
    }

    private TeamPerformanceResponse.TeamPerformanceData buildTeamPerformanceSummary(Team team) {
        try {
            LocalDateTime endDate = LocalDateTime.now();
            LocalDateTime startDate = endDate.minusDays(30);
            TeamPerformance performance = teamPerformanceService.calculateTeamPerformance(team.getId(), startDate, endDate);
            return mapPerformanceToSummary(performance, team.getMembers());
        } catch (Exception e) {
            log.debug("Failed to build performance summary for team {}", team.getId(), e);
            return null;
        }
    }

    private TeamPerformanceResponse.TeamPerformanceData mapPerformanceToSummary(
            TeamPerformance performance,
            List<User> members) {
        List<TeamPerformanceResponse.UserPerformanceData> memberPerformance = performance.getMemberPerformance() != null
                ? performance.getMemberPerformance().values().stream()
                    .map(member -> TeamPerformanceResponse.UserPerformanceData.builder()
                            .userId(member.getUserId())
                            .userName(member.getUserName())
                            .casesHandled(member.getTotalCases() != null ? member.getTotalCases().longValue() : 0L)
                            .casesResolved(member.getResolvedCases() != null ? member.getResolvedCases().longValue() : 0L)
                            .averageResolutionTime(member.getAvgResolutionTime())
                            .slaCompliance(member.getSlaCompliance())
                            .build())
                    .toList()
                : new ArrayList<>();

        long membersCount = members != null ? members.size() : memberPerformance.size();

        return TeamPerformanceResponse.TeamPerformanceData.builder()
                .teamId(performance.getTeamId())
                .teamName(performance.getTeamName())
                .totalCases(performance.getTotalCases())
                .resolvedCases(performance.getResolvedCases())
                .openCases(performance.getOpenCases())
                .averageResolutionTime(performance.getAvgResolutionTimeMinutes())
                .slaCompliance(performance.getSlaCompliance())
                .membersCount(membersCount)
                .members(memberPerformance)
                .build();
    }
    
    private TeamMemberResponse mapUserToMemberResponse(User user) {
        UserSummaryDto userDto = UserSummaryDto.builder()
                .id(user.getId())
                .name(user.getName())
                .fullName(user.getName())                     
                .username(user.getLogin())                    
                .email(user.getEmail())
                .login(user.getLogin())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .department(user.getDepartment())
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
                .specialization(user.getDepartment())
                .build();
    }

    /**
     * Get all active teams
     */
    @Transactional(readOnly = true)
    public List<Team> getActiveTeams() {
        log.info("Getting all active teams");
        return teamRepository.findAll();
    }
}
