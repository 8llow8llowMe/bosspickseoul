package com.followfollowme.bosspickseoul.global.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 배치 전체가 쓰는 시계(Asia/Seoul). 정책 수집·분기 적재 자동 최신화·스테이징 정리가 같이 쓴다.
 * 정책 설정({@code PolicyIngestionPropertiesConfig})에 있던 것을 컨텍스트 중립 위치로 옮겼다. 테스트는 {@code Clock.fixed} 로 바꿔 넣는다.
 */
@Configuration
public class BatchClockConfig {

    @Bean
    public Clock seoulClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
