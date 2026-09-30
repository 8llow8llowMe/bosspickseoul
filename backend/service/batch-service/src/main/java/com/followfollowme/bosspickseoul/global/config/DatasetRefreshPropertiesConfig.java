package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({DatasetRefreshProperties.class, DatasetStagingPurgeProperties.class})
public class DatasetRefreshPropertiesConfig {

}
