package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.share-link")
public record ShareLinkProperties(int ttlDays) {

}
