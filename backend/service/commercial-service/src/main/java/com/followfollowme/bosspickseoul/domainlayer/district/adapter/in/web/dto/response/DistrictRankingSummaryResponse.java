package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictFootTrafficRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictSalesRankingItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 지표별 전체 순위 응답 DTO. 지표마다 현재 분기 데이터가 있는 자치구가 모두 실린다")
public record DistrictRankingSummaryResponse(

    @Schema(description = "실제로 조회한 현재 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "실제로 비교한 이전 분기. 요청에서 생략하면 현재 기준 분기의 직전 분기", example = "20254")
    String previousPeriodCode,

    @Schema(description = "유동인구 전체 순위. 유동인구 내림차순, 같으면 자치구 코드 오름차순")
    List<DistrictFootTrafficRankingItem> footTrafficRankings,

    @Schema(description = "매출 전체 순위. 매출 금액 내림차순, 같으면 자치구 코드 오름차순")
    List<DistrictSalesRankingItem> salesRankings,

    @Schema(description = "개업 점포 전체 순위. 개업 점포 수 내림차순, 같으면 자치구 코드 오름차순")
    List<DistrictOpenedStoreRankingItem> openedStoreRankings,

    @Schema(description = "폐업 점포 전체 순위. 폐업 점포 수 내림차순, 같으면 자치구 코드 오름차순")
    List<DistrictClosedStoreRankingItem> closedStoreRankings
) {

}
