package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Case comment entity for case discussions
 * Maps to cases.case_comment table
 */
@Entity
@Table(name = "case_comment", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseComment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "comment", columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Column(name = "comment_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommentType commentType = CommentType.USER;

    @Column(name = "is_internal")
    @Builder.Default
    private Boolean isInternal = false;

    @Column(name = "attachments", columnDefinition = "jsonb")
    private String attachments;

    public enum CommentType {
        USER,
        SYSTEM,
        ACTION
    }
}