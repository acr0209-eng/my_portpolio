package com.exposurewatch.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.exposurewatch.domain.SuspiciousIpStatus;
import com.exposurewatch.service.SuspiciousIpService;

@Controller
public class AdminActionController {

    private final SuspiciousIpService suspiciousIpService;

    public AdminActionController(SuspiciousIpService suspiciousIpService) {
        this.suspiciousIpService = suspiciousIpService;
    }

    @PostMapping("/admin/suspicious-ips/{id}/status")
    public String updateStatus(
            @PathVariable Long id,
            @RequestParam SuspiciousIpStatus status,
            @RequestParam(required = false) String memo) {
        suspiciousIpService.updateStatus(id, status, memo);
        return "redirect:/admin/dashboard";
    }
}
