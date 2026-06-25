package com.exposurewatch.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.exposurewatch.domain.AdminAction;
import com.exposurewatch.domain.SecurityLog;
import com.exposurewatch.domain.SuspiciousIp;
import com.exposurewatch.domain.SuspiciousIpStatus;
import com.exposurewatch.dto.RiskIpDto;
import com.exposurewatch.repository.AdminActionRepository;
import com.exposurewatch.repository.SuspiciousIpRepository;

@Service
public class SuspiciousIpService {

    private final SuspiciousIpRepository suspiciousIpRepository;
    private final AdminActionRepository adminActionRepository;

    public SuspiciousIpService(SuspiciousIpRepository suspiciousIpRepository, AdminActionRepository adminActionRepository) {
        this.suspiciousIpRepository = suspiciousIpRepository;
        this.adminActionRepository = adminActionRepository;
    }

    @Transactional
    public void record(SecurityLog log) {
        if (!log.isSuspicious()) {
            suspiciousIpRepository.findByIpAddress(log.getIpAddress()).ifPresent(existing -> updateExisting(existing, log));
            return;
        }

        SuspiciousIp ip = suspiciousIpRepository.findByIpAddress(log.getIpAddress())
                .orElseGet(() -> create(log.getIpAddress(), log.getCreatedAt()));
        updateExisting(ip, log);
    }

    public List<RiskIpDto> topSuspiciousIps(int limit) {
        return suspiciousIpRepository
                .findBySuspiciousCountGreaterThanOrderByMaxRiskScoreDescSuspiciousCountDesc(0, PageRequest.of(0, limit))
                .stream()
                .map(this::toDto)
                .toList();
    }

    public long countSuspiciousIps() {
        return suspiciousIpRepository.countBySuspiciousCountGreaterThan(0);
    }

    @Transactional
    public void updateStatus(Long id, SuspiciousIpStatus status, String memo) {
        SuspiciousIp ip = suspiciousIpRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Suspicious IP not found: " + id));
        ip.setStatus(status);
        ip.setMemo(trimToNull(memo));

        AdminAction action = new AdminAction();
        action.setIpAddress(ip.getIpAddress());
        action.setActionType(status);
        action.setMemo(trimToNull(memo));
        adminActionRepository.save(action);
    }

    private SuspiciousIp create(String ipAddress, LocalDateTime seenAt) {
        SuspiciousIp ip = new SuspiciousIp();
        ip.setIpAddress(ipAddress);
        ip.setFirstSeenAt(seenAt);
        ip.setLastSeenAt(seenAt);
        ip.setStatus(SuspiciousIpStatus.WATCH);
        return ip;
    }

    private void updateExisting(SuspiciousIp ip, SecurityLog log) {
        ip.setTotalRequests(ip.getTotalRequests() + 1);
        if (log.isSuspicious()) {
            ip.setSuspiciousCount(ip.getSuspiciousCount() + 1);
        }
        ip.setMaxRiskScore(Math.max(ip.getMaxRiskScore(), log.getRiskScore()));
        ip.setLastSeenAt(log.getCreatedAt());
        suspiciousIpRepository.save(ip);
    }

    private RiskIpDto toDto(SuspiciousIp ip) {
        return new RiskIpDto(
                ip.getId(),
                ip.getIpAddress(),
                ip.getTotalRequests(),
                ip.getSuspiciousCount(),
                ip.getMaxRiskScore(),
                ip.getStatus(),
                ip.getMemo());
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
