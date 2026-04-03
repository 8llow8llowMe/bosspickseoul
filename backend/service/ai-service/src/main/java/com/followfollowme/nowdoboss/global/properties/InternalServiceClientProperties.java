package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "infra.clients")
public record InternalServiceClientProperties(
    String commercialServiceBaseUrl,
    String districtServiceBaseUrl,
    long connectTimeoutMs,
    long readTimeoutMs
) {

}
