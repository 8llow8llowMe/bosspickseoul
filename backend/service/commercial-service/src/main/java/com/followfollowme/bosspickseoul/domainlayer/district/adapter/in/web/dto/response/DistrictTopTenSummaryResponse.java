package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreTopTenItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictFootTrafficTopTenItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreTopTenItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictSalesTopTenItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 Top 10 요약 응답 DTO")
public record DistrictTopTenSummaryResponse(

    @Schema(description = "실제로 조회한 현재 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "실제로 비교한 이전 분기. 요청에서 생략하면 현재 기준 분기의 직전 분기", example = "20254")
    String previousPeriodCode,

    @Schema(description = "유동인구 Top 10 자치구 목록")
    List<DistrictFootTrafficTopTenItem> footTrafficTopTenItems,

    @Schema(description = "매출 Top 10 자치구 목록")
    List<DistrictSalesTopTenItem> salesTopTenItems,

    @Schema(description = "개업 점포 Top 10 자치구 목록")
    List<DistrictOpenedStoreTopTenItem> openedStoreTopTenItems,

    @Schema(description = "폐업 점포 Top 10 자치구 목록")
    List<DistrictClosedStoreTopTenItem> closedStoreTopTenItems
) {

}
