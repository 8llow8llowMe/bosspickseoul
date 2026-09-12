package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import java.util.List;

/**
 * 생성 대기/진행 중 화면에서 순환 표시할 진행 문구.
 *
 * <p>도메인 enum({@code AiReportJobType})이 아니라 web 계층에 둔다. {@code displayName}/{@code description} 은
 * {@code CodeNameDescribable} 메타데이터 계약의 일부라 도메인에 남지만, 이 문구는 실제 처리 단계와 대응하지 않는
 * 순수 UX 로테이션 카피다. 문구를 다듬는 일이 도메인 모델 변경으로 보이지 않게 소비처(Presenter) 옆에 둔다.
 */
final class AiReportProgressMessages {

    private static final List<String> COMMERCIAL = List.of(
        "상권 유동인구 흐름을 분석하고 있어요.",
        "업종별 매출 데이터를 요약하고 있어요.",
        "점포 개업·폐업 추이를 살펴보고 있어요.",
        "거주 인구와 소비력을 확인하고 있어요.",
        "AI가 창업 인사이트를 정리하고 있어요."
    );

    private static final List<String> COMMERCIAL_COMPARISON = List.of(
        "두 상권의 매출 규모를 비교하고 있어요.",
        "유동인구와 고객층 차이를 살펴보고 있어요.",
        "폐업률과 경쟁 강도를 견주어 보고 있어요.",
        "AI가 추천 상권과 근거를 정리하고 있어요."
    );

    private static final List<String> DISTRICT = List.of(
        "자치구 상권 변화 지표를 분석하고 있어요.",
        "업종별 점포와 매출 흐름을 요약하고 있어요.",
        "행정동별 개업·폐업 동향을 살펴보고 있어요.",
        "AI가 자치구 인사이트를 정리하고 있어요."
    );

    private static final List<String> ADMINISTRATION = List.of(
        "행정동 상권 데이터를 분석하고 있어요.",
        "업종별 매출과 점포 현황을 요약하고 있어요.",
        "지역 소비 흐름을 살펴보고 있어요.",
        "AI가 행정동 인사이트를 정리하고 있어요."
    );

    static List<String> of(AiReportJobType jobType) {
        return switch (jobType) {
            case COMMERCIAL -> COMMERCIAL;
            case COMMERCIAL_COMPARISON -> COMMERCIAL_COMPARISON;
            case DISTRICT -> DISTRICT;
            case ADMINISTRATION -> ADMINISTRATION;
        };
    }

    private AiReportProgressMessages() {
    }
}
