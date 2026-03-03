package com.followfollowme.nowdoboss.apigateway.config;

import com.followfollowme.nowdoboss.common.config.JasyptConfigurer;
import com.followfollowme.nowdoboss.redis.config.RedisConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    RedisConfigurer.class
})
public class ApiGatewayBeansConfig {

}
