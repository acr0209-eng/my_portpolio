package com.exposurewatch.dto;

import java.time.Instant;

public record CollectEventRequest(
        String path,
        String referrer,
        String userAgent,
        String language,
        Integer screenWidth,
        Integer screenHeight,
        Instant timestamp) {
}
