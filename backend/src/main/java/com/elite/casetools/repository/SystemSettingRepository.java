package com.elite.casetools.repository;

import com.elite.casetools.entity.SystemSetting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for SystemSetting entity
 */
@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {

    /**
     * Find setting by key
     */
    Optional<SystemSetting> findByKey(String key);

    /**
     * Find settings by category
     */
    List<SystemSetting> findByCategory(String category);

    /**
     * Find settings by category with pagination
     */
    Page<SystemSetting> findByCategory(String category, Pageable pageable);

    /**
     * Find all settings with pagination
     */
    Page<SystemSetting> findAllByOrderByCategory(Pageable pageable);

    /**
     * Check if setting exists by key
     */
    boolean existsByKey(String key);
}