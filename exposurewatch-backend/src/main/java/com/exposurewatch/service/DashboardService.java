package com.exposurewatch.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.exposurewatch.domain.RiskLevel;
import com.exposurewatch.domain.TrafficType;
import com.exposurewatch.dto.DashboardSummaryDto;
import com.exposurewatch.dto.SecurityLogDto;
import com.exposurewatch.repository.SecurityLogRepository;

@Service
public class DashboardService {

    private final SecurityLogRepository securityLogRepository;

    public DashboardService(SecurityLogRepository securityLogRepository) {
        this.securityLogRepository = securityLogRepository;
    }

    public DashboardSummaryDto todaySummary() {
        DateRange today = todayRange();
        return new DashboardSummaryDto(
                securityLogRepository.countByCreatedAtBetween(today.start(), today.end()),
                securityLogRepository.countBySuspiciousTrueAndCreatedAtBetween(today.start(), today.end()),
                securityLogRepository.countByRiskLevelInAndCreatedAtBetween(
                        List.of(RiskLevel.HIGH, RiskLevel.CRITICAL),
                        today.start(),
                        today.end()),
                securityLogRepository.countDistinctSuspiciousIpsBetween(today.start(), today.end()));
    }

    public List<SecurityLogDto> recentLogs(int limit) {
        return securityLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit))
                .stream()
                .map(SecurityLogDto::from)
                .toList();
    }

    public Map<String, Long> riskLevelDistribution() {
        DateRange today = todayRange();
        Map<RiskLevel, Long> counts = new EnumMap<>(RiskLevel.class);
        Arrays.stream(RiskLevel.values()).forEach(level -> counts.put(level, 0L));
        for (Object[] row : securityLogRepository.countByRiskLevelBetween(today.start(), today.end())) {
            counts.put((RiskLevel) row[0], (Long) row[1]);
        }
        Map<String, Long> result = new LinkedHashMap<>();
        counts.forEach((key, value) -> result.put(key.name(), value));
        return result;
    }

    public Map<String, Long> trafficTypeDistribution() {
        DateRange today = todayRange();
        Map<TrafficType, Long> counts = new EnumMap<>(TrafficType.class);
        Arrays.stream(TrafficType.values()).forEach(type -> counts.put(type, 0L));
        for (Object[] row : securityLogRepository.countByTrafficTypeBetween(today.start(), today.end())) {
            counts.put((TrafficType) row[0], (Long) row[1]);
        }
        Map<String, Long> result = new LinkedHashMap<>();
        counts.forEach((key, value) -> result.put(key.name(), value));
        return result;
    }

    public Map<String, Long> hourlyRequests() {
        DateRange today = todayRange();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (int hour = 0; hour < 24; hour++) {
            counts.put(String.format("%02d:00", hour), 0L);
        }
        for (Object[] row : securityLogRepository.countHourlyBetween(today.start(), today.end())) {
            Number hour = (Number) row[0];
            counts.put(String.format("%02d:00", hour.intValue()), (Long) row[1]);
        }
        return counts;
    }

    private DateRange todayRange() {
        LocalDate today = LocalDate.now();
        return new DateRange(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }

    private record DateRange(LocalDateTime start, LocalDateTime end) {
    }
}
