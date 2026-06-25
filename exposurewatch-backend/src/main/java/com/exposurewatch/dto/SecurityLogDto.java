package com.exposurewatch.dto;

import java.time.LocalDateTime;

import com.exposurewatch.domain.LogSource;
import com.exposurewatch.domain.RiskLevel;
import com.exposurewatch.domain.SecurityLog;
import com.exposurewatch.domain.TrafficType;

public record SecurityLogDto(
        Long id,
        String ipAddress,
        String method,
        String requestUri,
        String queryString,
        String userAgent,
        String referer,
        Integer statusCode,
        int riskScore,
        RiskLevel riskLevel,
        TrafficType trafficType,
        boolean suspicious,
        LogSource source,
        LocalDateTime createdAt) {

    public static SecurityLogDto from(SecurityLog log) {
        return new SecurityLogDto(
                log.getId(),
                log.getIpAddress(),
                log.getMethod(),
                log.getRequestUri(),
                log.getQueryString(),
                log.getUserAgent(),
                log.getReferer(),
                log.getStatusCode(),
                log.getRiskScore(),
                log.getRiskLevel(),
                log.getTrafficType(),
                log.isSuspicious(),
                log.getSource(),
                log.getCreatedAt());
    }
}
