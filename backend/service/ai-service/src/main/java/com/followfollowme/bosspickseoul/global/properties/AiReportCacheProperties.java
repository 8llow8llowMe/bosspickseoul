package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.report.cache")
public record AiReportCacheProperties(long ttlSeconds) {

}
