package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 수치 해석 안내")
public record ComparisonGuideItem(

    @Schema(description = "조회 기간 기준 설명")
    String periodBasis,

    @Schema(description = "조회 업종 기준 설명")
    String serviceBasis,

    @Schema(description = "차이값 계산 기준 설명")
    String differenceBasis,

    @Schema(description = "차이율 계산 기준과 0 처리 설명")
    String diffRateBasis,

    @Schema(description = "추천 결과 이용 시 주의 문구")
    String recommendationDisclaimer,

    @Schema(description = "응답 필드별 지표 그룹 설명")
    List<ComparisonMetricGroupGuideItem> metricGroups
) {
}
