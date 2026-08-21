package com.followfollowme.bosspickseoul.persistence.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "snowflake")
public record SnowflakeProperties(
    long datacenterId,
    long workerId
) {

}
