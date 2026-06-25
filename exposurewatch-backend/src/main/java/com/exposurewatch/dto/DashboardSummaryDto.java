package com.exposurewatch.dto;

public record DashboardSummaryDto(
        long todayTotalRequests,
        long todaySuspiciousRequests,
        long todayHighCriticalRequests,
        long uniqueSuspiciousIpCount) {
}
