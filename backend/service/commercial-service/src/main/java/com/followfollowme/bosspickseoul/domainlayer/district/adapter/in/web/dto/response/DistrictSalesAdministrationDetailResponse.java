package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictSalesAdministrationTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 행정동 매출 상세 응답 DTO")
public record DistrictSalesAdministrationDetailResponse(

    @Schema(description = "실제로 조회한 현재 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "실제로 비교한 이전 분기. 요청에서 생략하면 현재 기준 분기의 직전 분기", example = "20254")
    String previousPeriodCode,

    @Schema(description = "매출 상위 5개 행정동 목록")
    List<DistrictSalesAdministrationTopItem> topSalesAdministrations
) {

}
