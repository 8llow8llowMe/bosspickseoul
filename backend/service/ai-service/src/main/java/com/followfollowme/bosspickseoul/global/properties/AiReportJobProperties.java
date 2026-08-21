package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.report.job")
public record AiReportJobProperties(
    long ttlSeconds,
    long usageTtlSeconds,
    long pendingTimeoutSeconds,
    long runningTimeoutSeconds
) {

    public AiReportJobProperties {
        if (ttlSeconds <= 0) {
            ttlSeconds = 86_400L;
        }
        if (usageTtlSeconds <= 0) {
            usageTtlSeconds = 86_400L * 30L;
        }
        if (pendingTimeoutSeconds <= 0) {
            pendingTimeoutSeconds = 30L;
        }
        if (runningTimeoutSeconds <= 0) {
            runningTimeoutSeconds = 300L;
        }
    }
}
