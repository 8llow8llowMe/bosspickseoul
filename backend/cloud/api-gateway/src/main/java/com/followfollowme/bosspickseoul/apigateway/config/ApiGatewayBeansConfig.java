package com.followfollowme.bosspickseoul.apigateway.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.redis.config.RedisConfigurer;
import com.followfollowme.bosspickseoul.redis.config.RedisPropertiesConfig;
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
