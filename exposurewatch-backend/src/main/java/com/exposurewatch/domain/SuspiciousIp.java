package com.exposurewatch.domain;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class SuspiciousIp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String ipAddress;

    @Column(nullable = false)
    private long totalRequests;

    @Column(nullable = false)
    private long suspiciousCount;

    @Column(nullable = false)
    private int maxRiskScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SuspiciousIpStatus status = SuspiciousIpStatus.WATCH;

    @Column(length = 500)
    private String memo;

    @Column(nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(nullable = false)
    private LocalDateTime lastSeenAt;

    public Long getId() {
        return id;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public long getSuspiciousCount() {
        return suspiciousCount;
    }

    public void setSuspiciousCount(long suspiciousCount) {
        this.suspiciousCount = suspiciousCount;
    }

    public int getMaxRiskScore() {
        return maxRiskScore;
    }

    public void setMaxRiskScore(int maxRiskScore) {
        this.maxRiskScore = maxRiskScore;
    }

    public SuspiciousIpStatus getStatus() {
        return status;
    }

    public void setStatus(SuspiciousIpStatus status) {
        this.status = status;
    }

    public String getMemo() {
        return memo;
    }

    public void setMemo(String memo) {
        this.memo = memo;
    }

    public LocalDateTime getFirstSeenAt() {
        return firstSeenAt;
    }

    public void setFirstSeenAt(LocalDateTime firstSeenAt) {
        this.firstSeenAt = firstSeenAt;
    }

    public LocalDateTime getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(LocalDateTime lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }
}
