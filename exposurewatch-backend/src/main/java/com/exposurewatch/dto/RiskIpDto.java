package com.exposurewatch.dto;

import com.exposurewatch.domain.SuspiciousIpStatus;

public record RiskIpDto(
        Long id,
        String ipAddress,
        long totalRequests,
        long suspiciousCount,
        int maxRiskScore,
        SuspiciousIpStatus status,
        String memo) {
}
