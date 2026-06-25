package com.exposurewatch.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.exposurewatch.domain.SuspiciousIpStatus;
import com.exposurewatch.service.DashboardService;
import com.exposurewatch.service.SuspiciousIpService;

@Controller
public class DashboardController {

    private final DashboardService dashboardService;
    private final SuspiciousIpService suspiciousIpService;

    public DashboardController(DashboardService dashboardService, SuspiciousIpService suspiciousIpService) {
        this.dashboardService = dashboardService;
        this.suspiciousIpService = suspiciousIpService;
    }

    @GetMapping("/")
    public String index() {
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/admin/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("summary", dashboardService.todaySummary());
        model.addAttribute("recentLogs", dashboardService.recentLogs(50));
        model.addAttribute("topIps", suspiciousIpService.topSuspiciousIps(10));
        model.addAttribute("statuses", SuspiciousIpStatus.values());
        model.addAttribute("riskDistribution", dashboardService.riskLevelDistribution());
        model.addAttribute("trafficDistribution", dashboardService.trafficTypeDistribution());
        model.addAttribute("hourlyRequests", dashboardService.hourlyRequests());
        return "dashboard";
    }
}
