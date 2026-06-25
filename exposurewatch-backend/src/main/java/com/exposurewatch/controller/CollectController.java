package com.exposurewatch.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.exposurewatch.dto.CollectEventRequest;
import com.exposurewatch.service.LogCaptureService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api")
public class CollectController {

    private static final long MAX_COLLECT_PAYLOAD_BYTES = 8192;

    private final LogCaptureService logCaptureService;

    public CollectController(LogCaptureService logCaptureService) {
        this.logCaptureService = logCaptureService;
    }

    @PostMapping("/collect")
    public ResponseEntity<Void> collect(@RequestBody CollectEventRequest event, HttpServletRequest request) {
        if (event == null || invalidPayload(request) || invalidPath(event.path())) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }

        logCaptureService.captureFrontendEvent(event, request);
        return ResponseEntity.noContent().build();
    }

    private boolean invalidPath(String path) {
        return path != null && path.length() > 1024;
    }

    private boolean invalidPayload(HttpServletRequest request) {
        long contentLength = request.getContentLengthLong();
        return contentLength > MAX_COLLECT_PAYLOAD_BYTES;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Void> ignoreInvalidJson() {
        return ResponseEntity.noContent().build();
    }
}
