package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "batch.area-boundary.import")
public record AreaBoundaryImportProperties(
    String sourceDir
) {

}
