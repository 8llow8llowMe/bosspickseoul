package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 AI 리포트 응답 DTO")
public record CommercialComparisonAiReportResponse(

    @Schema(description = "비교 결과 전체 요약", example = "좌측 상권이 유동인구와 매출 안정성 측면에서 우세합니다.")
    String summary,

    @Schema(description = "추천 상권 방향", example = "LEFT")
    String recommendedSide,

    @Schema(description = "추천 이유 목록", example = "[\"분기 매출 증가율이 높습니다.\", \"폐업률이 상대적으로 낮습니다.\"]")
    List<String> recommendedReasons,

    @Schema(description = "위험도 비교 요약", example = "우측 상권은 경쟁 점포 밀도가 높아 초기 진입 위험이 큽니다.")
    String riskComparison,

    @Schema(description = "시간대 비교 요약", example = "좌측 상권은 저녁, 우측 상권은 점심 시간대 유동인구가 강합니다.")
    String timeSlotInsight,

    @Schema(description = "고객층 비교 요약", example = "좌측 상권은 20~30대, 우측 상권은 40~50대 비중이 높습니다.")
    String customerSegmentInsight,

    @Schema(description = "운영 전략 목록", example = "[\"저녁 시간대 중심의 인력 배치를 권장합니다.\"]")
    List<String> operationStrategy,

    @Schema(description = "한 줄 인사이트", example = "안정적인 수요 기반을 원한다면 좌측 상권 진입이 유리합니다.")
    String businessInsight,

    @Schema(description = "리포트 생성 시각", example = "2026-07-27T10:30:00")
    LocalDateTime generatedAt
) {
}
