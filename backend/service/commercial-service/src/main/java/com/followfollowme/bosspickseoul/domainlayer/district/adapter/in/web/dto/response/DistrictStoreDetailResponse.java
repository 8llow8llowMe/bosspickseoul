package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreAdministrationTopItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreAdministrationTopItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictStoreServiceTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 점포 상세 응답 DTO")
public record DistrictStoreDetailResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "점포 수 상위 8개 업종 목록")
    List<DistrictStoreServiceTopItem> topStoreServices,

    @Schema(description = "개업률 상위 행정동 Top 5")
    List<DistrictOpenedStoreAdministrationTopItem> topOpenedAdministrations,

    @Schema(description = "폐업률 상위 행정동 Top 5")
    List<DistrictClosedStoreAdministrationTopItem> topClosedAdministrations
) {

}
