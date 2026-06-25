package com.exposurewatch.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.exposurewatch.domain.RiskLevel;
import com.exposurewatch.domain.SecurityLog;
import com.exposurewatch.domain.TrafficType;

public interface SecurityLogRepository extends JpaRepository<SecurityLog, Long> {

    List<SecurityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countBySuspiciousTrueAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByRiskLevelInAndCreatedAtBetween(Collection<RiskLevel> riskLevels, LocalDateTime start, LocalDateTime end);

    long countByIpAddressAndCreatedAtAfter(String ipAddress, LocalDateTime createdAt);

    @Query("""
            select s.riskLevel, count(s)
            from SecurityLog s
            where s.createdAt between :start and :end
            group by s.riskLevel
            """)
    List<Object[]> countByRiskLevelBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("""
            select s.trafficType, count(s)
            from SecurityLog s
            where s.createdAt between :start and :end
            group by s.trafficType
            """)
    List<Object[]> countByTrafficTypeBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("""
            select hour(s.createdAt), count(s)
            from SecurityLog s
            where s.createdAt between :start and :end
            group by hour(s.createdAt)
            order by hour(s.createdAt)
            """)
    List<Object[]> countHourlyBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("""
            select count(distinct s.ipAddress)
            from SecurityLog s
            where s.suspicious = true and s.createdAt between :start and :end
            """)
    long countDistinctSuspiciousIpsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByIpAddressAndTrafficType(String ipAddress, TrafficType trafficType);
}
