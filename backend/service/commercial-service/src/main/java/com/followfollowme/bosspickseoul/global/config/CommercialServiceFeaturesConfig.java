package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.persistence.config.JpaAuditConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
// 만료 데이터 정리 스케줄러와 분석 기준 분기 카탈로그 갱신(AnalysisPeriodCatalogRefreshScheduler, 항상 켜짐)용.
// 정리 스케줄러 빈은 app.cleanup.* enabled 로 개별 제어한다. 풀 크기는 application.yml spring.task.scheduling.pool.size.
@EnableScheduling
@Import({
    JpaAuditConfig.class
})
public class CommercialServiceFeaturesConfig {

}
