package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AiReportJobType implements CodeNameDescribable {

    COMMERCIAL("상권 AI 리포트", "상권과 업종 분석 데이터를 기반으로 생성하는 AI 리포트입니다."),
    COMMERCIAL_COMPARISON("상권 비교 AI 인사이트", "두 상권의 비교 데이터를 기반으로 생성하는 AI 인사이트입니다."),
    DISTRICT("자치구 AI 리포트", "자치구 분석 데이터를 기반으로 생성하는 AI 리포트입니다."),
    ADMINISTRATION("행정동 AI 리포트", "행정동 분석 데이터를 기반으로 생성하는 AI 리포트입니다.");

    private final String displayName;
    private final String description;
}
