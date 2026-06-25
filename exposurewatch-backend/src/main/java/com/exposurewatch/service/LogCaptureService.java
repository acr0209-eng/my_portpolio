package com.exposurewatch.service;

import java.time.Instant;
import java.time.LocalDateTime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.exposurewatch.domain.LogSource;
import com.exposurewatch.domain.RiskLevel;
import com.exposurewatch.domain.SecurityLog;
import com.exposurewatch.domain.TrafficType;
import com.exposurewatch.dto.CollectEventRequest;
import com.exposurewatch.dto.SecurityLogDto;
import com.exposurewatch.repository.SecurityLogRepository;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class LogCaptureService {

    private static final int MAX_TEXT_LENGTH = 1000;

    private final SecurityLogRepository securityLogRepository;
    private final RiskScoringService riskScoringService;
    private final TrafficClassificationService trafficClassificationService;
    private final SuspiciousIpService suspiciousIpService;
    private final SimpMessagingTemplate messagingTemplate;

    public LogCaptureService(
            SecurityLogRepository securityLogRepository,
            RiskScoringService riskScoringService,
            TrafficClassificationService trafficClassificationService,
            SuspiciousIpService suspiciousIpService,
            SimpMessagingTemplate messagingTemplate) {
        this.securityLogRepository = securityLogRepository;
        this.riskScoringService = riskScoringService;
        this.trafficClassificationService = trafficClassificationService;
        this.suspiciousIpService = suspiciousIpService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public SecurityLog captureFrontendEvent(CollectEventRequest event, HttpServletRequest request) {
        String path = cleanPath(event.path());
        String ipAddress = resolveIpAddress(request);
        String userAgent = firstNonBlank(event.userAgent(), request.getHeader("User-Agent"));

        int riskScore = riskScoringService.calculateScore(ipAddress, path, userAgent);
        RiskLevel riskLevel = riskScoringService.toRiskLevel(riskScore);
        TrafficType trafficType = trafficClassificationService.classify(path, userAgent, riskScore);

        SecurityLog log = new SecurityLog();
        log.setIpAddress(ipAddress);
        log.setMethod("FRONTEND");
        log.setRequestUri(path);
        log.setUserAgent(truncate(userAgent));
        log.setReferer(truncate(firstNonBlank(event.referrer(), request.getHeader("Referer"))));
        log.setRiskScore(riskScore);
        log.setRiskLevel(riskLevel);
        log.setTrafficType(trafficType);
        log.setSuspicious(isSuspicious(riskLevel, trafficType));
        log.setSource(LogSource.FRONTEND_COLLECT);
        log.setLanguage(truncate(event.language(), 32));
        log.setScreenWidth(validScreenSize(event.screenWidth()));
        log.setScreenHeight(validScreenSize(event.screenHeight()));
        log.setClientTimestamp(validClientTimestamp(event.timestamp()));
        log.setCreatedAt(LocalDateTime.now());

        return saveAndPublish(log);
    }

    @Transactional
    public SecurityLog captureBackendRequest(
            HttpServletRequest request,
            int statusCode,
            LocalDateTime createdAt) {
        String ipAddress = resolveIpAddress(request);
        String requestUri = cleanPath(request.getRequestURI());
        String userAgent = request.getHeader("User-Agent");

        int riskScore = riskScoringService.calculateScore(ipAddress, requestUri, userAgent);
        RiskLevel riskLevel = riskScoringService.toRiskLevel(riskScore);
        TrafficType trafficType = trafficClassificationService.classify(requestUri, userAgent, riskScore);

        SecurityLog log = new SecurityLog();
        log.setIpAddress(ipAddress);
        log.setMethod(truncate(request.getMethod(), 12));
        log.setRequestUri(requestUri);
        log.setQueryString(truncate(request.getQueryString()));
        log.setUserAgent(truncate(userAgent));
        log.setReferer(truncate(request.getHeader("Referer")));
        log.setStatusCode(statusCode);
        log.setRiskScore(riskScore);
        log.setRiskLevel(riskLevel);
        log.setTrafficType(trafficType);
        log.setSuspicious(isSuspicious(riskLevel, trafficType));
        log.setSource(LogSource.BACKEND_REQUEST);
        log.setCreatedAt(createdAt);

        return saveAndPublish(log);
    }

    public String resolveIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private SecurityLog saveAndPublish(SecurityLog log) {
        SecurityLog saved = securityLogRepository.save(log);
        suspiciousIpService.record(saved);
        messagingTemplate.convertAndSend("/topic/security-logs", SecurityLogDto.from(saved));
        return saved;
    }

    private boolean isSuspicious(RiskLevel riskLevel, TrafficType trafficType) {
        return riskLevel == RiskLevel.HIGH
                || riskLevel == RiskLevel.CRITICAL
                || trafficType == TrafficType.SCANNER
                || trafficType == TrafficType.SUSPICIOUS;
    }

    private String cleanPath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        String trimmed = path.trim();
        if (!trimmed.startsWith("/")) {
            trimmed = "/" + trimmed;
        }
        return truncate(trimmed);
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private String truncate(String value) {
        return truncate(value, MAX_TEXT_LENGTH);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private Integer validScreenSize(Integer size) {
        if (size == null || size <= 0 || size > 20000) {
            return null;
        }
        return size;
    }

    private Instant validClientTimestamp(Instant timestamp) {
        if (timestamp == null) {
            return null;
        }
        Instant now = Instant.now();
        if (timestamp.isBefore(now.minus(30, java.time.temporal.ChronoUnit.DAYS)) || timestamp.isAfter(now.plus(10, java.time.temporal.ChronoUnit.MINUTES))) {
            return null;
        }
        return timestamp;
    }
}
