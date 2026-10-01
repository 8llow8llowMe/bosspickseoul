package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 평균 소득(대체). 같은 자치구 안의 상권은 모두 같은 값이라 상권 비교·점수에는 쓰지 않는다")
public record CommercialDistrictAverageIncomeItem(

    @Schema(description = "자치구 평균 신고 기준소득월액(원/월). 쓸 수 있는 자료가 없으면 null 이다", example = "1555244", nullable = true)
    Long amount,

    @Schema(description = "소득 지표의 출처 메타. 값이 없을 때도 사유를 전하므로 항상 채워진다")
    CommercialIncomeProvenanceItem provenance
) {

}
