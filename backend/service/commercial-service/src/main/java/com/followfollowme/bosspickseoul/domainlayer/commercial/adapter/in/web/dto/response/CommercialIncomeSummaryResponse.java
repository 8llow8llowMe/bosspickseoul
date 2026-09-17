package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseProvenanceItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalIncomeSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구/행정동/상권 지출 요약 응답")
public record CommercialIncomeSummaryResponse(

    @Schema(description = "자치구 지출 요약. 해당 분기에 행이 없는 지역 단위는 null 이다", nullable = true)
    RegionalIncomeSummaryItem district,

    @Schema(description = "행정동 지출 요약. 해당 분기에 행이 없는 지역 단위는 null 이다", nullable = true)
    RegionalIncomeSummaryItem administration,

    @Schema(
        description = "상권 지출 요약. 상권 원천이 끊긴 분기에는 소속 행정동 총액으로 대체하며 출처는 commercialProvenance 가 알려 준다. "
            + "대체할 행정동 값도 없으면 null 이다",
        nullable = true)
    RegionalIncomeSummaryItem commercial,

    @Schema(
        description = "상권 leg 의 출처 메타. 자치구·행정동 leg 는 원천이 살아 있어 대체하지 않으므로 상권 leg 에만 붙는다. "
            + "값이 없을 때도 중단 사실을 전하므로 항상 채워진다")
    CommercialExpenseProvenanceItem commercialProvenance
) {

}
