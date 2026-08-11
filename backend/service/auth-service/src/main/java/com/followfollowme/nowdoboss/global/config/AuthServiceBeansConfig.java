package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptConfigurer;
import com.followfollowme.nowdoboss.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.nowdoboss.persistence.config.SnowflakeConfigurer;
import com.followfollowme.nowdoboss.redis.config.RedisConfigurer;
import com.followfollowme.nowdoboss.security.auth.config.AuthSecurityConfigurer;
import com.followfollowme.nowdoboss.storage.config.StorageConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    AuthSecurityConfigurer.class,
    RedisConfigurer.class,
    StorageConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class AuthServiceBeansConfig {

}
