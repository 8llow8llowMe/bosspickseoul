package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 통합 상세 분석 응답")
public record AdministrationDetailResponse(
    @Schema(description = "행정동 코드")
    String administrationCode,
    @Schema(description = "행정동명")
    String administrationName,
    @Schema(description = "실제로 조회한 현재 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,
    @Schema(description = "실제로 비교한 이전 분기. 요청에서 생략하면 현재 기준 분기의 직전 분기", example = "20254")
    String previousPeriodCode,
    @Schema(description = "매출 상세")
    AdministrationSalesDetailResponse sales,
    @Schema(description = "점포 상세")
    AdministrationStoreDetailResponse store,
    @Schema(description = "지출 상세")
    AdministrationIncomeDetailResponse income
) {

}
