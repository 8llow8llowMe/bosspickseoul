package com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 통합 상세 분석 응답")
public record AdministrationDetailResponse(
    @Schema(description = "행정동 코드")
    String administrationCode,
    @Schema(description = "행정동명")
    String administrationName,
    @Schema(description = "매출 상세")
    AdministrationSalesDetailResponse sales,
    @Schema(description = "점포 상세")
    AdministrationStoreDetailResponse store,
    @Schema(description = "지출 상세")
    AdministrationIncomeDetailResponse income
) {

}
