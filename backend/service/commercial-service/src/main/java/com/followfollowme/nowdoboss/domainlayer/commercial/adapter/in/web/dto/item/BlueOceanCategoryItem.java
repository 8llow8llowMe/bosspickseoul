package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "블루오션 업종 항목 DTO — 소속 행정동에는 많지만 해당 상권에는 적은(비어 있는) 업종")
public record BlueOceanCategoryItem(

    @Schema(description = "서비스 업종 코드", example = "CS100005")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "제과점")
    String serviceName,

    @Schema(description = "해당 상권의 업종 점포 수", example = "0")
    long commercialStoreCount,

    @Schema(description = "소속 행정동의 업종 점포 수", example = "24")
    long administrationStoreCount,

    @Schema(description = "행정동 대비 상권 점유율(%) — 낮을수록 비어 있는 업종", example = "4.0")
    double storeRate
) {

}
