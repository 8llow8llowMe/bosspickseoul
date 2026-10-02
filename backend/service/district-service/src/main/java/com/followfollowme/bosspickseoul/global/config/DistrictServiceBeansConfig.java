package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class DistrictServiceBeansConfig {

    /** 시각을 코드에서 직접 만들지 않고 주입받게 해 테스트에서 고정할 수 있게 한다(commercial-service {@code seoulClock} 과 같은 방식). */
    @Bean
    Clock districtServiceClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
