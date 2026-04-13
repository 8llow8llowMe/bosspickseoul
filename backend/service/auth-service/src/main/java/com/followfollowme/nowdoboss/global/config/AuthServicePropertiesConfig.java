package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import com.followfollowme.nowdoboss.common.config.SwaggerPropertiesConfig;
import com.followfollowme.nowdoboss.persistence.config.SnowflakePropertiesConfig;
import com.followfollowme.nowdoboss.redis.config.RedisPropertiesConfig;
import com.followfollowme.nowdoboss.security.auth.config.JwtAuthPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class,
    JwtAuthPropertiesConfig.class,
    RedisPropertiesConfig.class,
    SnowflakePropertiesConfig.class
})
public class AuthServicePropertiesConfig {

}
