package com.elite.casetools.service;

import com.elite.casetools.dto.TeamPerformance;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating and tracking team performance metrics
 * Provides insights into team efficiency and workload distribution
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeamPerformanceService {

    private final TeamRepository teamRepository;
    private final CaseRepository caseRepository;
    private final CaseActivityRepository caseActivityRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Calculate comprehensive team performance metrics
     */
    @Cacheable(value = "team-performance", key = "#teamId + '_' + #startDate + '_' + #endDate")
    public TeamPerformance calculateTeamPerformance(Long teamId, LocalDateTime startDate, LocalDateTime endDate) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found: " + teamId));

        log.info("Calculating performance for team: {} from {} to {}", 
                team.getName(), startDate.format(DateTimeFormatter.ISO_LOCAL_DATE), 
                endDate.format(DateTimeFormatter.ISO_LOCAL_DATE));

        TeamPerformance performance = new TeamPerformance();
        performance.setTeamId(teamId);
        performance.setTeamName(team.getName());
        performance.setCalculatedAt(LocalDateTime.now());
        performance.setPeriodStart(startDate);
        performance.setPeriodEnd(endDate);

        // Get all team member IDs
        List<Long> memberIds = team.getMembers().stream()
                .map(User::getId)
                .collect(Collectors.toList());

        if (memberIds.isEmpty()) {
            log.warn("Team {} has no members", team.getName());
            return performance;
        }

        // Calculate core metrics
        performance.setTotalCases(calculateTotalCases(memberIds, startDate, endDate));
        performance.setResolvedCases(calculateResolvedCases(memberIds, startDate, endDate));
        performance.setOpenCases(calculateOpenCases(memberIds));
        performance.setInProgressCases(calculateInProgressCases(memberIds));
        performance.setAvgResolutionTimeMinutes(calculateAvgResolutionTime(memberIds, startDate, endDate));
        performance.setSlaCompliance(calculateSlaCompliance(memberIds, startDate, endDate));
        performance.setFalsePositiveRate(calculateFalsePositiveRate(memberIds, startDate, endDate));
        performance.setEscalationRate(calculateEscalationRate(memberIds, startDate, endDate));

        // Calculate workload distribution
        performance.setWorkloadDistribution(calculateWorkloadDistribution(memberIds));
        performance.setMemberPerformance(calculateMemberPerformance(team.getMembers(), startDate, endDate));

        // Calculate activity metrics
        performance.setTotalActivities(calculateTotalActivities(memberIds, startDate, endDate));
        performance.setCommentsCount(calculateCommentsCount(memberIds, startDate, endDate));

        // Calculate trend data
        performance.setResolutionTrend(calculateResolutionTrend(memberIds, startDate, endDate));
        performance.setCaseTrend(calculateCaseTrend(memberIds, startDate, endDate));

        log.info("Completed performance calculation for team: {} - Total Cases: {}, Resolution Rate: {}%", 
                team.getName(), performance.getTotalCases(), 
                Math.round(performance.getResolutionRate() * 100));

        return performance;
    }

    /**
     * Calculate performance for all teams
     */
    public List<TeamPerformance> calculateAllTeamsPerformance(LocalDateTime startDate, LocalDateTime endDate) {
        List<Team> activeTeams = teamRepository.findByIsActive(true);
        
        return activeTeams.stream()
                .map(team -> calculateTeamPerformance(team.getId(), startDate, endDate))
                .sorted((a, b) -> Double.compare(b.getSlaCompliance(), a.getSlaCompliance()))
                .collect(Collectors.toList());
    }

    /**
     * Get team performance comparison
     */
    public Map<String, Object> getTeamPerformanceComparison(List<Long> teamIds, 
                                                           LocalDateTime startDate, 
                                                           LocalDateTime endDate) {
        Map<String, Object> comparison = new HashMap<>();
        List<TeamPerformance> performances = new ArrayList<>();

        for (Long teamId : teamIds) {
            TeamPerformance performance = calculateTeamPerformance(teamId, startDate, endDate);
            performances.add(performance);
        }

        comparison.put("teams", performances);
        comparison.put("bestSlaCompliance", findBestPerformer(performances, "sla"));
        comparison.put("fastestResolution", findBestPerformer(performances, "speed"));
        comparison.put("highestVolume", findBestPerformer(performances, "volume"));
        comparison.put("averageMetrics", calculateAverageMetrics(performances));

        return comparison;
    }

    /**
     * Send weekly performance reports
     */
    @Scheduled(cron = "0 0 9 * * MON") // Every Monday at 9 AM
    @Transactional
    public void sendWeeklyPerformanceReports() {
        log.info("Generating weekly performance reports");
        
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusWeeks(1);
        
        List<Team> activeTeams = teamRepository.findByIsActive(true);
        
        for (Team team : activeTeams) {
            try {
                TeamPerformance performance = calculateTeamPerformance(team.getId(), startDate, endDate);
                String report = generatePerformanceReport(performance);
                
                // Send to team leader
                if (team.getLead() != null) {
                    notificationService.sendNotification(
                            team.getLead(),
                            "Weekly Team Performance Report",
                            report,
                            "PERFORMANCE_REPORT"
                    );
                }
                
                // Send to all managers
                notificationService.notifyManagers(
                        "Team Performance: " + team.getName(),
                        report
                );
                
                log.info("Sent weekly performance report for team: {}", team.getName());
                
            } catch (Exception e) {
                log.error("Failed to generate performance report for team: {}", team.getName(), e);
            }
        }
    }

    // Private helper methods

    private Long calculateTotalCases(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        return caseRepository.countByAssignedUserIdsAndCreatedAtBetween(userIdsArray, startDate, endDate);
    }

    private Long calculateResolvedCases(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        return caseRepository.countByAssignedUserIdsAndStatusAndResolvedAtBetween(
                userIdsArray, "RESOLVED", startDate, endDate);
    }

    private Long calculateOpenCases(List<Long> memberIds) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        return caseRepository.countByAssignedUserIdsAndStatus(userIdsArray, "OPEN");
    }

    private Long calculateInProgressCases(List<Long> memberIds) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        return caseRepository.countByAssignedUserIdsAndStatus(userIdsArray, "IN_PROGRESS");
    }

    private Double calculateAvgResolutionTime(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        List<Case> resolvedCases = caseRepository.findByAssignedUserIdsAndStatusAndResolvedAtBetween(
                userIdsArray, "RESOLVED", startDate, endDate);
        
        if (resolvedCases.isEmpty()) {
            return 0.0;
        }
        
        double totalMinutes = resolvedCases.stream()
                .filter(c -> c.getResolutionTimeMinutes() != null)
                .mapToDouble(Case::getResolutionTimeMinutes)
                .average()
                .orElse(0.0);
        
        return totalMinutes;
    }

    private Double calculateSlaCompliance(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        List<Case> completedCases = caseRepository.findByAssignedUserIdsAndResolvedAtBetween(
                userIdsArray, startDate, endDate);
        
        if (completedCases.isEmpty()) {
            return 100.0; // No cases to violate SLA
        }
        
        long withinSla = completedCases.stream()
                .filter(c -> c.getSlaBreached() == null || !c.getSlaBreached())
                .count();
        
        return (double) withinSla / completedCases.size() * 100.0;
    }

    private Double calculateFalsePositiveRate(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long totalCases = calculateTotalCases(memberIds, startDate, endDate);
        if (totalCases == 0) {
            return 0.0;
        }
        
        Long[] userIdsArray = memberIds.toArray(new Long[0]);
        Long falsePositives = caseRepository.countByAssignedUserIdsAndClosureReasonContaining(
                userIdsArray, "FALSE_POSITIVE", startDate, endDate);
        
        return (double) falsePositives / totalCases * 100.0;
    }

    private Double calculateEscalationRate(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long totalCases = calculateTotalCases(memberIds, startDate, endDate);
        if (totalCases == 0) {
            return 0.0;
        }
        
        // Count escalated activities by team members
        Long escalatedCases = 0L;
        for (Long memberId : memberIds) {
            Long userEscalations = caseActivityRepository.countByActivityTypeAndPerformedByAndPerformedAtBetween(
                    CaseActivity.ActivityType.ESCALATED, 
                    userRepository.findById(memberId).orElse(null),
                    startDate, 
                    endDate);
            escalatedCases += userEscalations;
        }
        
        return (double) escalatedCases / totalCases * 100.0;
    }

    private Map<String, Integer> calculateWorkloadDistribution(List<Long> memberIds) {
        Map<String, Integer> distribution = new HashMap<>();
        
        for (Long memberId : memberIds) {
            User user = userRepository.findById(memberId).orElse(null);
            if (user != null) {
                String[] statuses = {"OPEN", "IN_PROGRESS"};
                Long activeCases = caseRepository.countByAssignedUserIdAndStatusIn(memberId, statuses);
                distribution.put(user.getName(), activeCases.intValue());
            }
        }
        
        return distribution;
    }

    private Map<String, TeamPerformance.MemberPerformance> calculateMemberPerformance(
            List<User> members, LocalDateTime startDate, LocalDateTime endDate) {
        
        Map<String, TeamPerformance.MemberPerformance> memberStats = new HashMap<>();
        
        for (User member : members) {
            List<Long> singleMemberList = Arrays.asList(member.getId());
            
            TeamPerformance.MemberPerformance memberPerf = new TeamPerformance.MemberPerformance();
            memberPerf.setUserId(member.getId());
            memberPerf.setUserName(member.getName());
            memberPerf.setTotalCases(calculateTotalCases(singleMemberList, startDate, endDate).intValue());
            memberPerf.setResolvedCases(calculateResolvedCases(singleMemberList, startDate, endDate).intValue());
            memberPerf.setAvgResolutionTime(calculateAvgResolutionTime(singleMemberList, startDate, endDate));
            memberPerf.setSlaCompliance(calculateSlaCompliance(singleMemberList, startDate, endDate));
            memberPerf.setActiveCases(calculateOpenCases(singleMemberList).intValue() + 
                                    calculateInProgressCases(singleMemberList).intValue());
            
            // Calculate resolution rate
            if (memberPerf.getTotalCases() > 0) {
                memberPerf.setResolutionRate((double) memberPerf.getResolvedCases() / memberPerf.getTotalCases() * 100.0);
            }
            
            memberStats.put(member.getName(), memberPerf);
        }
        
        return memberStats;
    }

    private Long calculateTotalActivities(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        return caseActivityRepository.countByPerformedByInAndPerformedAtBetween(memberIds, startDate, endDate);
    }

    private Long calculateCommentsCount(List<Long> memberIds, LocalDateTime startDate, LocalDateTime endDate) {
        Long total = 0L;
        for (Long memberId : memberIds) {
            User user = userRepository.findById(memberId).orElse(null);
            if (user != null) {
                Long userComments = caseActivityRepository.countByActivityTypeAndPerformedByAndPerformedAtBetween(
                        CaseActivity.ActivityType.STATUS_CHANGE, user, startDate, endDate);
                total += userComments;
            }
        }
        return total;
    }

    private List<TeamPerformance.TrendPoint> calculateResolutionTrend(List<Long> memberIds, 
                                                                     LocalDateTime startDate, 
                                                                     LocalDateTime endDate) {
        // Simplified trend calculation - daily resolution counts for the past week
        List<TeamPerformance.TrendPoint> trend = new ArrayList<>();
        LocalDateTime current = startDate;
        
        while (current.isBefore(endDate)) {
            LocalDateTime nextDay = current.plusDays(1);
            Long[] userIdsArray = memberIds.toArray(new Long[0]);
            Long resolvedCount = caseRepository.countByAssignedUserIdsAndStatusAndResolvedAtBetween(
                    userIdsArray, "RESOLVED", current, nextDay);
            
            trend.add(new TeamPerformance.TrendPoint(
                    current.toLocalDate().toString(),
                    resolvedCount.doubleValue()
            ));
            
            current = nextDay;
        }
        
        return trend;
    }

    private List<TeamPerformance.TrendPoint> calculateCaseTrend(List<Long> memberIds, 
                                                               LocalDateTime startDate, 
                                                               LocalDateTime endDate) {
        // Simplified trend calculation - daily case creation counts
        List<TeamPerformance.TrendPoint> trend = new ArrayList<>();
        LocalDateTime current = startDate;
        
        while (current.isBefore(endDate)) {
            LocalDateTime nextDay = current.plusDays(1);
            Long caseCount = calculateTotalCases(memberIds, current, nextDay);
            
            trend.add(new TeamPerformance.TrendPoint(
                    current.toLocalDate().toString(),
                    caseCount.doubleValue()
            ));
            
            current = nextDay;
        }
        
        return trend;
    }

    private TeamPerformance findBestPerformer(List<TeamPerformance> performances, String metric) {
        if (performances.isEmpty()) {
            return null;
        }
        
        return switch (metric) {
            case "sla" -> performances.stream()
                    .max(Comparator.comparing(TeamPerformance::getSlaCompliance))
                    .orElse(null);
            case "speed" -> performances.stream()
                    .min(Comparator.comparing(TeamPerformance::getAvgResolutionTimeMinutes))
                    .orElse(null);
            case "volume" -> performances.stream()
                    .max(Comparator.comparing(TeamPerformance::getTotalCases))
                    .orElse(null);
            default -> performances.get(0);
        };
    }

    private Map<String, Double> calculateAverageMetrics(List<TeamPerformance> performances) {
        if (performances.isEmpty()) {
            return new HashMap<>();
        }
        
        Map<String, Double> averages = new HashMap<>();
        
        averages.put("avgSlaCompliance", performances.stream()
                .mapToDouble(TeamPerformance::getSlaCompliance)
                .average().orElse(0.0));
        
        averages.put("avgResolutionTime", performances.stream()
                .mapToDouble(TeamPerformance::getAvgResolutionTimeMinutes)
                .average().orElse(0.0));
        
        averages.put("avgCaseVolume", performances.stream()
                .mapToDouble(TeamPerformance::getTotalCases)
                .average().orElse(0.0));
        
        return averages;
    }

    private String generatePerformanceReport(TeamPerformance performance) {
        StringBuilder report = new StringBuilder();
        
        report.append("=== Weekly Performance Report ===\n");
        report.append("Team: ").append(performance.getTeamName()).append("\n");
        report.append("Period: ").append(performance.getPeriodStart().toLocalDate())
              .append(" to ").append(performance.getPeriodEnd().toLocalDate()).append("\n\n");
        
        report.append("📊 Key Metrics:\n");
        report.append("• Total Cases: ").append(performance.getTotalCases()).append("\n");
        report.append("• Resolved Cases: ").append(performance.getResolvedCases()).append("\n");
        report.append("• Resolution Rate: ").append(String.format("%.1f%%", performance.getResolutionRate())).append("\n");
        report.append("• SLA Compliance: ").append(String.format("%.1f%%", performance.getSlaCompliance())).append("\n");
        report.append("• Avg Resolution Time: ").append(String.format("%.1f minutes", performance.getAvgResolutionTimeMinutes())).append("\n");
        report.append("• False Positive Rate: ").append(String.format("%.1f%%", performance.getFalsePositiveRate())).append("\n\n");
        
        report.append("👥 Team Member Performance:\n");
        performance.getMemberPerformance().forEach((name, perf) -> {
            report.append(String.format("• %s: %d cases, %.1f%% resolution, %.1f%% SLA\n", 
                    name, perf.getTotalCases(), perf.getResolutionRate(), perf.getSlaCompliance()));
        });
        
        return report.toString();
    }
}