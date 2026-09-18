package com.followfollowme.bosspickseoul.domainlayer.commercial.application.model;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreCountsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;

/**
 * 히트맵 점수식이 읽는 원천 한 벌.
 *
 * <p><b>소득소비는 들고 있지 않다.</b> 소득 항과 지출 항이 차례로 점수식에서 빠진 뒤(이슈 #413) 이 필드를
 * 읽는 코드가 0 건이 됐는데도, 히트맵 요청마다 뷰포트 안 상권 전부에 대해 {@code in} 절 조회를 한 번 더 돌리고
 * 결과를 전부 변환한 뒤 버리고 있었다. 필드가 남아 있으면 「이미 점수에 연결돼 있다」고 잘못 읽히기도 한다.
 * 소비를 점수에 되살리려면 {@link #hasAllMetrics()} 와 {@code CommercialHeatmapQueryProcessor.computeOpportunity}
 * 를 함께 고쳐야 하고, 그 전에 <b>상권 단위</b> 지출 원천이 실제로 되살아나야 한다 — 행정동 대체값은 같은
 * 행정동 상권이 전부 같은 값이라 점수에 넣으면 가짜 차이가 만들어진다. (이슈 #415)
 */
public record CommercialHeatmapSource(
    String commercialCode,
    String commercialName,
    CommercialSalesInfo sales,
    CommercialFootTrafficInfo footTraffic,
    CommercialStoreCountsInfo store,
    CommercialResidentPopulationInfo population,
    CommercialFacilityInfo facility,
    ChangeCommercial changeCommercial
) {

    public static CommercialHeatmapSource empty(String commercialCode) {
        return new CommercialHeatmapSource(commercialCode, commercialCode, null, null, null, null, null, null);
    }

    /**
     * 점수 산정에 반드시 필요한 원천 목록. {@code CommercialHeatmapQueryProcessor.buildSource} 도 이 메서드로
     * 판정하므로 조건은 여기 한 곳에만 있다.
     */
    public boolean hasAllMetrics() {
        return sales != null && footTraffic != null && store != null
            && population != null && facility != null;
    }
}
