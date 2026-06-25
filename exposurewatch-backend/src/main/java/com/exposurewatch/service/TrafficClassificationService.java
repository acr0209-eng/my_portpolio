package com.exposurewatch.service;

import java.util.Locale;

import org.springframework.stereotype.Service;

import com.exposurewatch.domain.TrafficType;

@Service
public class TrafficClassificationService {

    public TrafficType classify(String pathOrUri, String userAgent, int riskScore) {
        String path = normalize(pathOrUri);
        String ua = normalize(userAgent);

        if (path.contains("/.env")
                || path.contains("/.git/config")
                || path.contains("/wp-admin")
                || path.contains("/phpmyadmin")) {
            return TrafficType.SCANNER;
        }

        if (ua.contains("googlebot")
                || ua.contains("bingbot")
                || ua.contains("gptbot")
                || ua.contains("claudebot")
                || ua.contains("applebot")
                || ua.contains("duckduckbot")) {
            return TrafficType.CRAWLER;
        }

        if (riskScore >= 50
                || ua.contains("curl")
                || ua.contains("python-requests")
                || ua.contains("sqlmap")
                || ua.contains("nikto")
                || ua.contains("nmap")) {
            return TrafficType.SUSPICIOUS;
        }

        return TrafficType.NORMAL;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
