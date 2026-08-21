package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AiReportJobType implements CodeNameDescribable {

    COMMERCIAL("상권 AI 리포트", "상권과 업종 분석 데이터를 기반으로 생성하는 AI 리포트입니다.", List.of(
        "상권 유동인구 흐름을 분석하고 있어요.",
        "업종별 매출 데이터를 요약하고 있어요.",
        "점포 개업·폐업 추이를 살펴보고 있어요.",
        "거주 인구와 소비력을 확인하고 있어요.",
        "AI가 창업 인사이트를 정리하고 있어요."
    )),
    COMMERCIAL_COMPARISON("상권 비교 AI 인사이트", "두 상권의 비교 데이터를 기반으로 생성하는 AI 인사이트입니다.", List.of(
        "두 상권의 매출 규모를 비교하고 있어요.",
        "유동인구와 고객층 차이를 살펴보고 있어요.",
        "폐업률과 경쟁 강도를 견주어 보고 있어요.",
        "AI가 추천 상권과 근거를 정리하고 있어요."
    )),
    DISTRICT("자치구 AI 리포트", "자치구 분석 데이터를 기반으로 생성하는 AI 리포트입니다.", List.of(
        "자치구 상권 변화 지표를 분석하고 있어요.",
        "업종별 점포와 매출 흐름을 요약하고 있어요.",
        "행정동별 개업·폐업 동향을 살펴보고 있어요.",
        "AI가 자치구 인사이트를 정리하고 있어요."
    )),
    ADMINISTRATION("행정동 AI 리포트", "행정동 분석 데이터를 기반으로 생성하는 AI 리포트입니다.", List.of(
        "행정동 상권 데이터를 분석하고 있어요.",
        "업종별 매출과 점포 현황을 요약하고 있어요.",
        "지역 소비 흐름을 살펴보고 있어요.",
        "AI가 행정동 인사이트를 정리하고 있어요."
    ));

    private final String displayName;
    private final String description;
    // 생성 대기/진행 중에 화면에서 순환 표시할 진행 문구. 실제 처리 단계와 무관한 UX 연출용이다.
    private final List<String> progressMessages;
}
