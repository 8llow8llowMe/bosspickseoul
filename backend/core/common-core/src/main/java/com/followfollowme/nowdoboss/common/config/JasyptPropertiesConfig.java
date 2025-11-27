package com.followfollowme.nowdoboss.common.config;

import com.followfollowme.nowdoboss.common.properties.JasyptProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JasyptProperties.class)
public class JasyptPropertiesConfig {

}
