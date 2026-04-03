package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.report.cache")
public record AiReportCacheProperties(long ttlSeconds) {

}
