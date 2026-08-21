package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 점포 상위 업종 항목")
public record AdministrationStoreServiceTopItem(
    @Schema(description = "서비스 코드")
    String serviceCode,
    @Schema(description = "서비스명")
    String serviceName,
    @Schema(description = "총 점포 수")
    long totalStoreCount,
    @Schema(description = "유사 업종 점포 수")
    long similarStoreCount,
    @Schema(description = "개업 점포 수")
    long openedStoreCount,
    @Schema(description = "폐업 점포 수")
    long closedStoreCount,
    @Schema(description = "프랜차이즈 점포 수")
    long franchiseStoreCount,
    @Schema(description = "개업률")
    double openingRate,
    @Schema(description = "폐업률")
    double closureRate
) {

}
