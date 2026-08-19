package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "프랜차이즈 검색 항목 DTO")
public record SimulationFranchiseeSearchItem(

    @Schema(description = "프랜차이즈 아이디", example = "101")
    long franchiseeId,

    @Schema(description = "브랜드 이름", example = "본죽")
    String brandName,

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "한식음식점")
    String serviceName
) {

}
