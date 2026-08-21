package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakeConfigurer;
import com.followfollowme.bosspickseoul.redis.config.RedisConfigurer;
import com.followfollowme.bosspickseoul.security.auth.config.AuthSecurityConfigurer;
import com.followfollowme.bosspickseoul.storage.config.StorageConfigurer;
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
