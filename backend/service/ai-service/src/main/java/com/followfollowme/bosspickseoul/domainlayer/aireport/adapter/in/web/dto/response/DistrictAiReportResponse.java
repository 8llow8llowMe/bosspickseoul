package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 AI 리포트 응답 DTO")
public record DistrictAiReportResponse(
    @Schema(description = "시장 요약", example = "강남구는 직장인 수요 기반의 외식업 매출이 꾸준한 지역입니다.")
    String summary,
    @Schema(description = "시장 상태 요약", example = "상권 확장기로 신규 점포 유입이 활발합니다.")
    String marketStatus,
    @Schema(description = "추천 업종군", example = "[\"한식음식점\", \"커피-음료\"]")
    List<String> recommendedBusinessCategories,
    @Schema(description = "주의 업종군", example = "[\"의류점\", \"PC방\"]")
    List<String> cautionBusinessCategories,
    @Schema(description = "창업 관점 코멘트", example = "임대료 부담이 크므로 배후 수요가 검증된 블록 위주로 검토를 권장합니다.")
    String businessInsight,
    @Schema(description = "리포트 생성 시각", example = "2026-07-27T10:30:00")
    LocalDateTime generatedAt
) {
}
