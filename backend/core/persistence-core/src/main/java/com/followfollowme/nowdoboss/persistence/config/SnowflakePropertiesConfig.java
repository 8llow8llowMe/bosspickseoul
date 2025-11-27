package com.followfollowme.nowdoboss.persistence.config;

import com.followfollowme.nowdoboss.persistence.properties.SnowflakeProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SnowflakeProperties.class)
public class SnowflakePropertiesConfig {

}

