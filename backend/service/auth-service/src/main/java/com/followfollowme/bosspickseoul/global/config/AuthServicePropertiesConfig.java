package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptPropertiesConfig;
import com.followfollowme.bosspickseoul.common.config.SwaggerPropertiesConfig;
import com.followfollowme.bosspickseoul.global.properties.LoginAttemptProperties;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakePropertiesConfig;
import com.followfollowme.bosspickseoul.redis.config.RedisPropertiesConfig;
import com.followfollowme.bosspickseoul.security.auth.config.JwtAuthPropertiesConfig;
import com.followfollowme.bosspickseoul.storage.config.StoragePropertiesConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class,
    JwtAuthPropertiesConfig.class,
    RedisPropertiesConfig.class,
    SnowflakePropertiesConfig.class,
    StoragePropertiesConfig.class
})
@EnableConfigurationProperties({
    LoginAttemptProperties.class
})
public class AuthServicePropertiesConfig {

}
