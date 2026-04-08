package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import com.followfollowme.nowdoboss.global.properties.AiReportCacheProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    AiReportCacheProperties.class,
    AiLlmProperties.class
})
public class AiServicePropertiesConfig {

}
