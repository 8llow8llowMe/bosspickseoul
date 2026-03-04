package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesAdministrationTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 행정동 매출 상세 응답")
public record DistrictSalesAdministrationDetailResponse(

    @Schema(description = "매출 상위 5개 행정동 목록")
    List<DistrictSalesAdministrationTopItem> topSalesAdministrations
) {

}
