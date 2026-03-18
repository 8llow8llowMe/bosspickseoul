package com.followfollowme.nowdoboss.domainlayer.aireport.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.report.cache")
public record AiReportCacheProperties(
    long ttlSeconds
) {

}
