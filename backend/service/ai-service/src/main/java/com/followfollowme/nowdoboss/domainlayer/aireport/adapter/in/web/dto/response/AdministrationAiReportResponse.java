package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "행정동 AI 리포트 응답 DTO")
public record AdministrationAiReportResponse(
    @Schema(description = "시장 요약", example = "청운효자동은 주거 기반 수요가 안정적인 생활권 상권입니다.")
    String summary,
    @Schema(description = "시장 상태 요약", example = "상권 정체기로 신규 진입보다 차별화 전략이 중요합니다.")
    String marketStatus,
    @Schema(description = "추천 업종군", example = "[\"제과점\", \"커피-음료\"]")
    List<String> recommendedBusinessCategories,
    @Schema(description = "주의 업종군", example = "[\"호프-간이주점\"]")
    List<String> cautionBusinessCategories,
    @Schema(description = "창업 관점 코멘트", example = "고정 주거 수요를 겨냥한 단골 중심 운영 전략을 권장합니다.")
    String businessInsight,
    @Schema(description = "리포트 생성 시각", example = "2026-07-27T10:30:00")
    LocalDateTime generatedAt
) {
}
