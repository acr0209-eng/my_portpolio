package com.exposurewatch.filter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.exposurewatch.service.LogCaptureService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final List<String> EXCLUDED_PREFIXES = List.of(
            "/css/",
            "/js/",
            "/images/",
            "/webjars/",
            "/api/collect",
            "/ws");

    private final LogCaptureService logCaptureService;

    public RequestLoggingFilter(LogCaptureService logCaptureService) {
        this.logCaptureService = logCaptureService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return "/favicon.ico".equals(uri)
                || EXCLUDED_PREFIXES.stream().anyMatch(uri::startsWith);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        LocalDateTime receivedAt = LocalDateTime.now();
        try {
            filterChain.doFilter(request, response);
        } finally {
            logCaptureService.captureBackendRequest(request, response.getStatus(), receivedAt);
        }
    }
}
