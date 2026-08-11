package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.persistence.config.JpaAuditConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
// 만료 데이터 정리 스케줄러용. 스케줄러 빈 자체는 app.cleanup.* enabled 로 개별 제어한다.
@EnableScheduling
@Import({
    JpaAuditConfig.class
})
public class CommercialServiceFeaturesConfig {

}
