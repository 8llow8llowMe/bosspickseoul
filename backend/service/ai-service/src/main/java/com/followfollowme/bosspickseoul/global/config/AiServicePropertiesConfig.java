package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptPropertiesConfig;
import com.followfollowme.bosspickseoul.common.config.SwaggerPropertiesConfig;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProperties;
import com.followfollowme.bosspickseoul.global.properties.AiReportCacheProperties;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.global.properties.AiReportUsageLimitProperties;
import com.followfollowme.bosspickseoul.redis.config.RedisPropertiesConfig;
import com.followfollowme.bosspickseoul.security.resourceserver.config.JwtResourceServerPropertiesConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class,
    JwtResourceServerPropertiesConfig.class,
    RedisPropertiesConfig.class
})
@EnableConfigurationProperties({
    AiReportCacheProperties.class,
    AiReportJobProperties.class,
    AiReportUsageLimitProperties.class,
    AiLlmProperties.class
})
public class AiServicePropertiesConfig {

}
