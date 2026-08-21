package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 점포수 상위 업종 항목")
public record DistrictStoreServiceTopItem(
    @Schema(description = "업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "업종명", example = "한식음식점")
    String serviceName,

    @Schema(description = "총 점포 수", example = "1523")
    long totalStoreCount
) {

}
