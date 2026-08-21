package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

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
