package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * SystemSetting entity representing application settings
 * Maps to casemanagement.system_setting table
 */
@Entity
@Table(name = "system_setting", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSetting extends BaseEntity {

    @Column(name = "setting_key", unique = true, nullable = false, length = 100)
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "default_value", columnDefinition = "TEXT")
    private String defaultValue;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "data_type", length = 20)
    @Builder.Default
    private String dataType = "STRING";

    @Column(name = "required")
    @Builder.Default
    private Boolean required = false;

    @Column(name = "encrypted")
    @Builder.Default
    private Boolean encrypted = false;

    @Column(name = "validation_rules", columnDefinition = "TEXT")
    private String validationRules;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;
}