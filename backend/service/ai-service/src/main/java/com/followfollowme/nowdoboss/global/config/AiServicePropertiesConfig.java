package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.AiLlmProperties;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.AiReportCacheProperties;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.InternalServiceClientProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    InternalServiceClientProperties.class,
    AiReportCacheProperties.class,
    AiLlmProperties.class
})
public class AiServicePropertiesConfig {

}
