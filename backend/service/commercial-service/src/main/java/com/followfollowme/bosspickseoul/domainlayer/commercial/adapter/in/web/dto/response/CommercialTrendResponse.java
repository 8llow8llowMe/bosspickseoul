package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialTrendItemDto;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.enums.PeriodTrendType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 트렌드 분석 응답 DTO")
public record CommercialTrendResponse(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "조회 지표 타입")
    CommercialTrendMetricType metricType,

    @Schema(description = "최근 2분기 기준 추세 방향")
    PeriodTrendType trendDirection,

    @Schema(description = "분기별 지표 값 목록 (과거 → 최근순)")
    List<CommercialTrendItemDto> periods
) {

}
