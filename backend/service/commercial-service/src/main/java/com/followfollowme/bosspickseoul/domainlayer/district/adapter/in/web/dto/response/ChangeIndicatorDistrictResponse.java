package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 변화지표 상세 응답 DTO")
public record ChangeIndicatorDistrictResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 currentPeriodCode 를 생략하면 서버가 정한 기본 분기", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String currentPeriodCode,

    @Schema(description = "상권 변화지표 코드", example = "LL")
    String changeIndicatorCode,

    @Schema(description = "상권 변화지표명", example = "성장")
    String changeIndicatorName,

    @Schema(description = "평균 개업 영업 개월 수", example = "14")
    int averageOpenedMonths,

    @Schema(description = "평균 폐업 영업 개월 수", example = "9")
    int averageClosedMonths
) {

}
