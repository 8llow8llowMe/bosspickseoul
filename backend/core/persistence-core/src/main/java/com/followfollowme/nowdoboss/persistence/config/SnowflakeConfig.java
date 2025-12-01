package com.followfollowme.nowdoboss.persistence.config;

import com.followfollowme.nowdoboss.persistence.properties.SnowflakeProperties;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SnowflakeConfig {

    @Bean
    public SnowflakeIdGenerator snowflakeIdGenerator(SnowflakeProperties properties) {
        // 서버마다 workerId / dataCenterId를 다르게 설정해줘야함
        return new SnowflakeIdGenerator(properties.datacenterId(), properties.workerId());
    }
}
