package com.exposurewatch.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.exposurewatch.domain.SuspiciousIp;

public interface SuspiciousIpRepository extends JpaRepository<SuspiciousIp, Long> {

    Optional<SuspiciousIp> findByIpAddress(String ipAddress);

    List<SuspiciousIp> findBySuspiciousCountGreaterThanOrderByMaxRiskScoreDescSuspiciousCountDesc(long suspiciousCount, Pageable pageable);

    long countBySuspiciousCountGreaterThan(long suspiciousCount);
}
