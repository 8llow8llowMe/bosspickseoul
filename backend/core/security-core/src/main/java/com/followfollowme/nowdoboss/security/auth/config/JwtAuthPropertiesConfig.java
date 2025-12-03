package com.followfollowme.nowdoboss.security.auth.config;

import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JwtAuthProperties.class)
public class JwtAuthPropertiesConfig {

}
