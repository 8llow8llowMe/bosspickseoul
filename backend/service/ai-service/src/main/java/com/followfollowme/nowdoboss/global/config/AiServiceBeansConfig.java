package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptConfigurer;
import com.followfollowme.nowdoboss.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.nowdoboss.redis.config.RedisConfigurer;
import com.followfollowme.nowdoboss.security.resourceserver.config.ResourceServerSecurityConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    RedisConfigurer.class,
    ResourceServerSecurityConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class AiServiceBeansConfig {

}
