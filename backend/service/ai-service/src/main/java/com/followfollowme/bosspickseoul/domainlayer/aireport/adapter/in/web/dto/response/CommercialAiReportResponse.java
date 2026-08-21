package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 AI 리포트 응답 DTO")
public record CommercialAiReportResponse(
    @Schema(description = "한 줄 요약", example = "유동인구와 배후 수요가 안정적인 상권으로, 저녁 시간대 외식업 수요가 두드러집니다.")
    String summary,
    @Schema(description = "강점 목록", example = "[\"역세권 유동인구가 풍부합니다.\", \"20~30대 유동인구 비중이 높습니다.\"]")
    List<String> strengths,
    @Schema(description = "주의점 목록", example = "[\"동일 업종 경쟁 점포가 많습니다.\", \"임대료 수준이 높은 편입니다.\"]")
    List<String> risks,
    @Schema(description = "추천 업종군", example = "[\"한식음식점\", \"커피-음료\"]")
    List<String> recommendedBusinessCategories,
    @Schema(description = "추천 고객층", example = "[\"20대 직장인\", \"30대 여성\"]")
    List<String> recommendedCustomerSegments,
    @Schema(description = "추천 운영 시간대", example = "[\"11:00~14:00\", \"17:00~21:00\"]")
    List<String> recommendedOperatingHours,
    @Schema(description = "피해야 할 운영 시간대", example = "[\"06:00~10:00\"]")
    List<String> avoidOperatingHours,
    @Schema(description = "타깃 연령대", example = "[\"20대\", \"30대\"]")
    List<String> targetAgeGroups,
    @Schema(description = "타깃 성별", example = "[\"여성\"]")
    List<String> targetGenders,
    @Schema(description = "운영 팁", example = "[\"점심 회전율을 높이는 세트 메뉴 구성을 권장합니다.\"]")
    List<String> operationTips,
    @Schema(description = "창업 관점 코멘트", example = "초기 6개월은 점심 수요 확보에 집중하는 전략이 유효합니다.")
    String businessInsight,
    @Schema(description = "리포트 생성 시각", example = "2026-07-27T10:30:00")
    LocalDateTime generatedAt
) {
}
