package com.exposurewatch.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.exposurewatch.dto.SecurityLogDto;
import com.exposurewatch.service.DashboardService;

@RestController
@RequestMapping("/api/admin/logs")
public class LogApiController {

    private final DashboardService dashboardService;

    public LogApiController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/recent")
    public List<SecurityLogDto> recentLogs() {
        return dashboardService.recentLogs(50);
    }
}
