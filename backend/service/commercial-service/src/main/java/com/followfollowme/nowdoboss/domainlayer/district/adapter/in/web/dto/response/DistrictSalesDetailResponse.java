package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesAdministrationTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesServiceTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 매출 상세 응답 DTO")
public record DistrictSalesDetailResponse(

    @Schema(description = "매출 상위 5개 업종 목록")
    List<DistrictSalesServiceTopItem> topSalesServices,

    @Schema(description = "매출 상위 5개 행정동 목록")
    List<DistrictSalesAdministrationTopItem> topSalesAdministrations
) {

}
