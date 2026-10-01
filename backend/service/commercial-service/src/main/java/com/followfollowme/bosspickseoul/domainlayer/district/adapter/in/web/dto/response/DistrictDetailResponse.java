package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 통합 상세 응답 DTO")
public record DistrictDetailResponse(

    @Schema(description = "실제로 조회한 현재 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "실제로 비교한 이전 분기. 요청에서 생략하면 현재 기준 분기의 직전 분기", example = "20254")
    String previousPeriodCode,

    @Schema(description = "상권 변화지표 상세")
    ChangeIndicatorDistrictResponse changeIndicator,

    @Schema(description = "유동인구 상세")
    FootTrafficDistrictDetailResponse footTraffic,

    @Schema(description = "점포 상세")
    DistrictStoreDetailResponse store,

    @Schema(description = "매출 상세")
    DistrictSalesDetailResponse sales
) {

}
