package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "정책 추천 항목")
public record PolicyRecommendationItem(

    @Schema(description = "정책 식별자", example = "POLICY-001")
    String policyId,

    @Schema(description = "정책명", example = "서울시 소상공인 창업 지원")
    String policyName,

    @Schema(description = "지원 기관", example = "서울특별시")
    String provider,

    @Schema(description = "지원 대상 요약", example = "예비 창업자")
    String targetSummary,

    @Schema(description = "지원 내용 요약", example = "창업 교육, 컨설팅, 초기 자금 연계")
    String supportSummary,

    @Schema(description = "추천 이유")
    String matchingReason,

    @Schema(description = "신청 기간", example = "상시 또는 분기별 공고")
    String applicationPeriod,

    @Schema(description = "참고 URL", example = "https://www.seoul.go.kr")
    String referenceUrl
) {

}
