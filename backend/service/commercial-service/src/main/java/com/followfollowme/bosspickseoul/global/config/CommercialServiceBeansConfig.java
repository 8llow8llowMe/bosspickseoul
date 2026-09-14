package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakeConfigurer;
import com.followfollowme.bosspickseoul.redis.config.RedisConfigurer;
import com.followfollowme.bosspickseoul.security.resourceserver.config.ResourceServerSecurityConfigurer;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    QuerydslConfigurer.class,
    RedisConfigurer.class,
    ResourceServerSecurityConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class CommercialServiceBeansConfig {

    /**
     * 시각을 코드에서 직접 만들지 않고 주입받게 해 테스트에서 고정할 수 있게 한다.
     * batch-service 의 {@code PolicyIngestionPropertiesConfig} 와 같은 방식이다.
     */
    @Bean
    Clock seoulClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
