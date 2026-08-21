package com.followfollowme.bosspickseoul.security.resourceserver.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt.resource")
public record JwtResourceServerProperties(
    String accessKey
) {

}
