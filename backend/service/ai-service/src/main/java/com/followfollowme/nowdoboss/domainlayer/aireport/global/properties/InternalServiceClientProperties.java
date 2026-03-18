package com.followfollowme.nowdoboss.domainlayer.aireport.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "infra.clients")
public record InternalServiceClientProperties(
    String commercialServiceBaseUrl,
    String districtServiceBaseUrl,
    int connectTimeoutMs,
    int readTimeoutMs
) {

}
