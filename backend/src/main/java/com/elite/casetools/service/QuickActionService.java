package com.elite.casetools.service;

import com.elite.casetools.entity.*;
import com.elite.casetools.repository.*;
import com.elite.casetools.dto.MergeResult;
import com.elite.casetools.dto.QuickActionRequest;
import com.elite.casetools.dto.QuickActionResponse;
import com.elite.casetools.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for quick actions on cases
 * Provides simple, direct actions without complex workflows
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class QuickActionService {

    private final CaseRepository caseRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final RuleAssignmentRepository ruleAssignmentRepository;
    private final CaseActivityRepository caseActivityRepository;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;

    /**
     * Acknowledge a case
     */
    @Transactional
    public QuickActionResponse acknowledge(Long caseId, Long userId, String notes) {
        Case caseEntity = caseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Update case status
        caseEntity.setStatus(Case.CaseStatus.IN_PROGRESS);
        
        // Add activity
        CaseActivity activity = CaseActivity.builder()
                .caseEntity(caseEntity)
                .activityType(CaseActivity.ActivityType.STATUS_CHANGE)
                .description("Case acknowledged by " + user.getName())
                .details(notes)
                .performedBy(user)
                .performedAt(LocalDateTime.now())
                .build();
        
        caseActivityRepository.save(activity);
        caseRepository.save(caseEntity);
        
        // Send notification to team
        notificationService.notifyTeam(
                caseEntity, 
                "Case " + caseEntity.getCaseNumber() + " acknowledged by " + user.getName()
        );

        log.info("Case {} acknowledged by user {}", caseEntity.getCaseNumber(), user.getName());

        return QuickActionResponse.builder()
                .success(true)
                .action("ACKNOWLEDGE")
                .caseId(caseId)
                .caseNumber(caseEntity.getCaseNumber())
                .message("Case acknowledged successfully")
                .performedBy(user.getName())
                .performedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Mark case as false positive
     */
    @Transactional
    public QuickActionResponse markFalsePositive(Long caseId, Long userId, String reason) {
        Case caseEntity = caseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Update case status
        caseEntity.setStatus(Case.CaseStatus.CLOSED);
        caseEntity.setClosureReason("FALSE_POSITIVE: " + reason);
        caseEntity.setClosedAt(LocalDateTime.now());
        caseEntity.setClosedBy(user);
        
        // Create suppression pattern for future (if rule UID exists)
        if (caseEntity.getGrafanaAlertUid() != null) {
            createSuppressionPattern(caseEntity.getGrafanaAlertUid(), reason);
        }
        
        // Add activity
        CaseActivity activity = CaseActivity.builder()
                .caseEntity(caseEntity)
                .activityType(CaseActivity.ActivityType.CLOSED)
                .description("Case marked as false positive")
                .details("Reason: " + reason)
                .performedBy(user)
                .performedAt(LocalDateTime.now())
                .build();
        
        caseActivityRepository.save(activity);
        caseRepository.save(caseEntity);
        
        // Update metrics
        recordFalsePositive(caseEntity);

        log.info("Case {} marked as false positive by user {}", caseEntity.getCaseNumber(), user.getName());

        return QuickActionResponse.builder()
                .success(true)
                .action("FALSE_POSITIVE")
                .caseId(caseId)
                .caseNumber(caseEntity.getCaseNumber())
                .message("Case marked as false positive")
                .performedBy(user.getName())
                .performedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Escalate case to higher priority
     */
    @Transactional
    public QuickActionResponse escalate(Long caseId, Long userId, String reason) {
        Case caseEntity = caseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Update priority and status
        caseEntity.setPriority(1); // URGENT
        caseEntity.setStatus(Case.CaseStatus.IN_PROGRESS);
        
        // Find escalation team/manager from rule assignment
        RuleAssignment rule = null;
        if (caseEntity.getGrafanaAlertUid() != null) {
            rule = ruleAssignmentRepository.findByGrafanaRuleUid(caseEntity.getGrafanaAlertUid())
                    .orElse(null);
        }
        
        if (rule != null && rule.getEscalationTeamId() != null) {
            // Reassign to escalation team
            Team escalationTeam = teamRepository.findById(rule.getEscalationTeamId())
                    .orElse(null);
            if (escalationTeam != null) {
                reassignToTeam(caseEntity, escalationTeam);
            }
        }
        
        // Add activity
        CaseActivity activity = CaseActivity.builder()
                .caseEntity(caseEntity)
                .activityType(CaseActivity.ActivityType.ESCALATED)
                .description("Case escalated to priority P1")
                .details("Reason: " + reason)
                .performedBy(user)
                .performedAt(LocalDateTime.now())
                .build();
        
        caseActivityRepository.save(activity);
        caseRepository.save(caseEntity);
        
        // Notify managers
        notificationService.notifyManagers(
                "ESCALATED: " + caseEntity.getCaseNumber(),
                "Case escalated by " + user.getName() + "\nReason: " + reason
        );

        log.info("Case {} escalated by user {}", caseEntity.getCaseNumber(), user.getName());

        return QuickActionResponse.builder()
                .success(true)
                .action("ESCALATE")
                .caseId(caseId)
                .caseNumber(caseEntity.getCaseNumber())
                .message("Case escalated to P1")
                .performedBy(user.getName())
                .performedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Merge similar cases
     */
    @Transactional
    public MergeResult mergeSimilarCases(Long primaryCaseId, List<Long> secondaryCaseIds, Long userId) {
        Case primaryCase = caseRepository.findById(primaryCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Primary case not found: " + primaryCaseId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        List<String> mergedCaseNumbers = new ArrayList<>();
        
        for (Long secondaryId : secondaryCaseIds) {
            Case secondaryCase = caseRepository.findById(secondaryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Secondary case not found: " + secondaryId));
            
            mergedCaseNumbers.add(secondaryCase.getCaseNumber());
            
            // Merge descriptions
            primaryCase.setDescription(
                    primaryCase.getDescription() + "\n\n[Merged from " +
                    secondaryCase.getCaseNumber() + "]\n" +
                    secondaryCase.getDescription()
            );
            
            // Copy activities
            List<CaseActivity> activities = caseActivityRepository.findByCaseEntity(secondaryCase);
            for (CaseActivity activity : activities) {
                CaseActivity copiedActivity = CaseActivity.builder()
                        .caseEntity(primaryCase)
                        .activityType(activity.getActivityType())
                        .description("[From " + secondaryCase.getCaseNumber() + "] " + activity.getDescription())
                        .details(activity.getDetails())
                        .performedBy(activity.getPerformedBy())
                        .performedAt(activity.getPerformedAt())
                        .build();
                caseActivityRepository.save(copiedActivity);
            }
            
            // Copy comments
            List<CaseComment> comments = secondaryCase.getComments();
            for (CaseComment comment : comments) {
                CaseComment copiedComment = CaseComment.builder()
                        .caseEntity(primaryCase)
                        .comment("[From " + secondaryCase.getCaseNumber() + "] " + comment.getComment())
                        .user(comment.getUser()) // Use user field instead of createdBy
                        .createdBy(comment.getUser()) // Also set createdBy
                        .isInternal(comment.getIsInternal())
                        .build();
                primaryCase.getComments().add(copiedComment);
            }
            
            // Close secondary case
            secondaryCase.setStatus(Case.CaseStatus.CLOSED);
            secondaryCase.setClosureReason("MERGED_INTO: " + primaryCase.getCaseNumber());
            secondaryCase.setClosedAt(LocalDateTime.now());
            secondaryCase.setClosedBy(user);
            
            caseRepository.save(secondaryCase);
        }
        
        // Add merge activity to primary case
        CaseActivity mergeActivity = CaseActivity.builder()
                .caseEntity(primaryCase)
                .activityType(CaseActivity.ActivityType.MERGED)
                .description("Merged " + secondaryCaseIds.size() + " cases into this case")
                .details("Merged cases: " + String.join(", ", mergedCaseNumbers))
                .performedBy(user)
                .performedAt(LocalDateTime.now())
                .build();
        
        caseActivityRepository.save(mergeActivity);
        caseRepository.save(primaryCase);

        log.info("Merged {} cases into case {}", secondaryCaseIds.size(), primaryCase.getCaseNumber());

        return MergeResult.builder()
                .primaryCase(primaryCase)
                .mergedCount(secondaryCaseIds.size())
                .mergedCaseNumbers(mergedCaseNumbers)
                .performedBy(user.getName())
                .performedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Helper method to reassign case to a team
     */
    private void reassignToTeam(Case caseEntity, Team team) {
        com.elite.casetools.dto.AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        
        // Clear existing assignments
        assignmentInfo.getUserIds().clear();
        assignmentInfo.getTeamIds().clear();
        
        // Add new team assignment
        assignmentInfo.addTeam(team.getId());
        
        // Also assign to team lead if exists
        if (team.getLeader() != null) {
            assignmentInfo.addUser(team.getLeader().getId());
        }
        
        caseEntity.setAssignmentInfo(assignmentInfo);
        caseEntity.setAssignedAt(LocalDateTime.now());
    }

    /**
     * Create suppression pattern for false positives
     */
    private void createSuppressionPattern(String ruleUid, String reason) {
        // TODO: Implement suppression pattern storage
        // This would store patterns to automatically suppress similar alerts in the future
        log.info("Creating suppression pattern for rule UID: {} with reason: {}", ruleUid, reason);
    }

    /**
     * Record false positive metrics
     */
    private void recordFalsePositive(Case caseEntity) {
        // TODO: Implement metrics recording
        // This would update metrics for false positive tracking
        log.info("Recording false positive for case: {}", caseEntity.getCaseNumber());
    }
}