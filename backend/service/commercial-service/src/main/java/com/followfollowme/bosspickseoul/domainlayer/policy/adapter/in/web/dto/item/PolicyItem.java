package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import lombok.Builder;

@Builder
@Schema(description = "지원 정책 항목 DTO")
public record PolicyItem(

    @Schema(description = "정책 아이디", example = "7345678901234567890")
    String policyId,

    @Schema(description = "정책명", example = "2026 소상공인 경영개선 자금")
    String title,

    @Schema(description = "지원 기관", example = "서울신용보증재단")
    String organization,

    @Schema(description = "지원 유형 코드", example = "FUNDING")
    String supportType,

    @Schema(description = "지원 유형 표시명", example = "자금")
    String supportTypeName,

    @Schema(description = "지원 대상 요약", example = "서울시 소재 업력 1년 이상 소상공인")
    String targetSummary,

    @Schema(description = "지원 내용", example = "업체당 최대 5천만원, 연 2.0% 고정금리")
    String supportContent,

    @Schema(description = "지원 대상 자치구 코드. null 이면 서울 전역/전국", example = "11680")
    String districtCode,

    @Schema(description = "지원 대상 업종 대분류. null 이면 전업종", example = "CS1")
    String serviceCategoryCode,

    @Schema(description = "신청 시작일. null 이면 제한 없음", example = "2026-03-01")
    LocalDate applyStartAt,

    @Schema(description = "신청 마감일. null 이면 상시 모집", example = "2026-12-31")
    LocalDate applyEndAt,

    @Schema(description = "상세 안내 URL")
    String detailUrl
) {

}
