package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseCategoryItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseProvenanceItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권의 소비 지출 정보 조회 응답")
public record CommercialIncomeAndExpenseResponse(

    @Schema(
        description = "항목별 지출. 배열 순서가 곧 화면 순서이고 항목 수는 provenance.scope 에 따라 9개(상권) 또는 10개(행정동 대체)다. "
            + "상권 원천도 행정동 대체도 없는 분기에는 null 이다",
        nullable = true)
    List<CommercialExpenseCategoryItem> expenseCategories,

    @Schema(description = "항목별 지출의 합계(원). 항목이 없으면 null 이다", example = "1560000", nullable = true)
    Long totalExpenseAmount,

    @Schema(description = "소비 지표의 출처 메타. 값이 없을 때도 중단 사실을 전하므로 항상 채워진다")
    CommercialExpenseProvenanceItem provenance
) {

}
