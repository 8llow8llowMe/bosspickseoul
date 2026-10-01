package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialDistrictAverageIncomeItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseCategoryItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseProvenanceItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권의 소비 지출과 자치구 평균 소득(대체) 조회 응답")
public record CommercialIncomeAndExpenseResponse(

    @Schema(
        description = "항목별 지출. 배열 순서가 곧 화면 순서이고 항목 수는 provenance.scope 에 따라 9개(상권) 또는 10개(행정동 대체)다. "
            + "상권 원천도 행정동 대체도 없는 분기에는 null 이다",
        nullable = true)
    List<CommercialExpenseCategoryItem> expenseCategories,

    @Schema(description = "항목별 지출의 합계(원). 항목이 없으면 null 이다", example = "1560000", nullable = true)
    Long totalExpenseAmount,

    @Schema(description = "소비 지표의 출처 메타. 값이 없을 때도 중단 사실을 전하므로 항상 채워진다")
    CommercialExpenseProvenanceItem provenance,

    @Schema(
        description = "자치구 평균 소득(대체). 상권 단위 소득 원천이 없어 소속 자치구의 국민연금 지역가입자 신고 평균소득월액을 참고값으로 싣는다. "
            + "소비(provenance)와 원천·기준이 달라 출처를 따로 든다. 쓸 수 있는 자료가 없어도 amount 만 null 이고 항상 채워진다")
    CommercialDistrictAverageIncomeItem districtAverageIncome
) {

}
