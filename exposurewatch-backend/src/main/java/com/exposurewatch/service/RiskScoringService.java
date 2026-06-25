package com.exposurewatch.service;

import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.exposurewatch.domain.RiskLevel;
import com.exposurewatch.repository.SecurityLogRepository;

@Service
public class RiskScoringService {

    private final SecurityLogRepository securityLogRepository;

    public RiskScoringService(SecurityLogRepository securityLogRepository) {
        this.securityLogRepository = securityLogRepository;
    }

    public int calculateScore(String ipAddress, String pathOrUri, String userAgent) {
        int score = 0;
        String path = normalize(pathOrUri);
        String ua = normalize(userAgent);

        if (path.contains("admin")) {
            score += 30;
        }
        if (path.contains("login")) {
            score += 20;
        }
        if (path.contains("wp-admin")) {
            score += 40;
        }
        if (path.contains("phpmyadmin")) {
            score += 40;
        }
        if (path.contains(".env")) {
            score += 50;
        }
        if (path.contains(".git/config")) {
            score += 50;
        }
        if (path.contains("backup") || path.contains("dump") || path.contains("config") || path.contains(".sql")) {
            score += 35;
        }
        if (ua.isBlank()) {
            score += 20;
        }
        if (ua.contains("curl")
                || ua.contains("python-requests")
                || ua.contains("sqlmap")
                || ua.contains("nikto")
                || ua.contains("nmap")) {
            score += 30;
        }

        long recentRequests = securityLogRepository.countByIpAddressAndCreatedAtAfter(
                ipAddress,
                LocalDateTime.now().minusMinutes(5));
        if (recentRequests >= 30) {
            score += 30;
        } else if (recentRequests >= 10) {
            score += 20;
        }

        return Math.min(score, 100);
    }

    public RiskLevel toRiskLevel(int score) {
        if (score >= 80) {
            return RiskLevel.CRITICAL;
        }
        if (score >= 50) {
            return RiskLevel.HIGH;
        }
        if (score >= 20) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.LOW;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
