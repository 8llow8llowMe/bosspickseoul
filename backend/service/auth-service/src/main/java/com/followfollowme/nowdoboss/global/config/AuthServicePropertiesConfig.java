package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import com.followfollowme.nowdoboss.common.config.SwaggerPropertiesConfig;
import com.followfollowme.nowdoboss.global.properties.LoginAttemptProperties;
import com.followfollowme.nowdoboss.persistence.config.SnowflakePropertiesConfig;
import com.followfollowme.nowdoboss.redis.config.RedisPropertiesConfig;
import com.followfollowme.nowdoboss.security.auth.config.JwtAuthPropertiesConfig;
import com.followfollowme.nowdoboss.storage.config.StoragePropertiesConfig;
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
