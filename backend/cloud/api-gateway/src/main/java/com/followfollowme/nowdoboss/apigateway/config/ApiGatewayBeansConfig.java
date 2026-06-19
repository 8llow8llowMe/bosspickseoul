package com.followfollowme.nowdoboss.apigateway.config;

import com.followfollowme.nowdoboss.common.config.JasyptConfigurer;
import com.followfollowme.nowdoboss.redis.config.RedisConfigurer;
import com.followfollowme.nowdoboss.redis.config.RedisPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    RedisPropertiesConfig.class,
    RedisConfigurer.class
})
public class ApiGatewayBeansConfig {

}
