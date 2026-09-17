package com.followfollowme.bosspickseoul.domainlayer.commercial.application.model;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreCountsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;

public record CommercialHeatmapSource(
    String commercialCode,
    String commercialName,
    CommercialSalesInfo sales,
    CommercialFootTrafficInfo footTraffic,
    CommercialStoreCountsInfo store,
    CommercialResidentPopulationInfo population,
    CommercialIncomeAndExpenseInfo income,
    CommercialFacilityInfo facility,
    ChangeCommercial changeCommercial
) {

    public static CommercialHeatmapSource empty(String commercialCode) {
        return new CommercialHeatmapSource(commercialCode, commercialCode, null, null, null, null, null, null, null);
    }

    /**
     * 점수 산정에 반드시 필요한 원천 목록. {@code CommercialHeatmapQueryProcessor.buildSource} 도 이 메서드로
     * 판정하므로 조건은 여기 한 곳에만 있다.
     *
     * <p>소득소비({@code income})는 필수가 아니다. 2024년 이후 1,650개 상권 중 560곳은 해당 행 자체가 없는데,
     * 소득 지표가 걷히고 지출 항까지 점수식에서 빠진 뒤로는 그 상권을 빼도 얻는 것이 없다. 오히려 네 지표
     * 전부가 INSUFFICIENT 로 빠져 지도에서 통째로 사라진다. (이슈 #413)
     */
    public boolean hasAllMetrics() {
        return sales != null && footTraffic != null && store != null
            && population != null && facility != null;
    }
}
