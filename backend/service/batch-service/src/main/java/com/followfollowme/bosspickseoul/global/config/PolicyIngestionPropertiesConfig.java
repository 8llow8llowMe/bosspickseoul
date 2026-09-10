package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PolicyIngestionProperties.class)
public class PolicyIngestionPropertiesConfig {

    @Bean
    Clock seoulClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
