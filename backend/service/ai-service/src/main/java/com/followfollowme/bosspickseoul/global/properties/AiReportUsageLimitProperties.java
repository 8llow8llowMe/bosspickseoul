package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI 리포트 생성 사용량 상한. 로그인 계정 하나로 LLM 을 무제한 호출하는 어뷰징을 막는다.
 *
 * <p>기본값 30건/일 근거: {@code docs/services/ai-service.md} 에 구체적인 수치 기준이 없어
 * 워커 풀 특성으로 산정했다. LLM 은 미니PC 1대(동시 생성 1건)이고 리포트 1건 생성이 실측
 * 8~40초라, 사용자 1명이 하루 30건을 요청하면 이미 워커를 최대 20분 점유한다. 일반 사용자의
 * 하루 열람량(상권 몇 곳 비교)을 크게 웃도는 값이라 정상 사용은 걸리지 않고, 스크립트 어뷰징은
 * 확실히 잘린다.
 */
@ConfigurationProperties(prefix = "ai.report.usage-limit")
public record AiReportUsageLimitProperties(
    int dailyLimit
) {

    public AiReportUsageLimitProperties {
        if (dailyLimit <= 0) {
            dailyLimit = 30;
        }
    }
}
