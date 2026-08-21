package com.followfollowme.bosspickseoul.redis.config;

import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RedisProperties.class)
public class RedisPropertiesConfig {

}
