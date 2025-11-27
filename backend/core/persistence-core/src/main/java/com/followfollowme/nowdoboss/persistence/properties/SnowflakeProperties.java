package com.followfollowme.nowdoboss.persistence.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "snowflake")
public record SnowflakeProperties(
    long datacenterId,
    long workerId
) {

}
