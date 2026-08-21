package com.followfollowme.bosspickseoul.common.config;

import com.followfollowme.bosspickseoul.common.properties.SwaggerProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SwaggerProperties.class)
public class SwaggerPropertiesConfig {

}
