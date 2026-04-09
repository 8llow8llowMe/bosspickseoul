package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 통합 상세 응답 DTO")
public record DistrictDetailResponse(

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
