package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 변화지표 상세 응답 DTO")
public record ChangeIndicatorDistrictResponse(

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
