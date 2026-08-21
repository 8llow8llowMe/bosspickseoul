package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.share-link")
public record ShareLinkProperties(int ttlDays) {

}
