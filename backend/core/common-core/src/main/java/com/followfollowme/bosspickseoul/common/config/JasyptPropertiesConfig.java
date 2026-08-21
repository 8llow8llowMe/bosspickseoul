package com.followfollowme.bosspickseoul.common.config;

import com.followfollowme.bosspickseoul.common.properties.JasyptProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JasyptProperties.class)
public class JasyptPropertiesConfig {

}
