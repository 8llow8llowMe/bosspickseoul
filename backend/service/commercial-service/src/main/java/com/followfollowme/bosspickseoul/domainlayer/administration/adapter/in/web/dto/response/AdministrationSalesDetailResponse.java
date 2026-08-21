package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item.AdministrationSalesServiceTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "행정동 매출 상세 응답")
public record AdministrationSalesDetailResponse(
    @Schema(description = "매출 상위 업종 목록")
    List<AdministrationSalesServiceTopItem> topSalesServices
) {

}
