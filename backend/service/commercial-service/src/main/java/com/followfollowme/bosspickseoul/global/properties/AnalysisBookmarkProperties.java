package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분석 보관함 설정.
 * maxPerMember 는 회원 한 명이 저장할 수 있는 보관함 항목 수 상한이다 (무한 적재 방지).
 */
@ConfigurationProperties(prefix = "app.analysis-bookmark")
public record AnalysisBookmarkProperties(int maxPerMember) {

    private static final int DEFAULT_MAX_PER_MEMBER = 100;

    public AnalysisBookmarkProperties {
        if (maxPerMember <= 0) {
            maxPerMember = DEFAULT_MAX_PER_MEMBER;
        }
    }
}
