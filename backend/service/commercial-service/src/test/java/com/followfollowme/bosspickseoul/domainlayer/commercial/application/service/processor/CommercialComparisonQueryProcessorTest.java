package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.ComparisonWinnerSide;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import java.util.List;
import org.junit.jupiter.api.Test;

class CommercialComparisonQueryProcessorTest {

    private static final CommercialComparisonTargetInfo LEFT = target("왼쪽 상권");
    private static final CommercialComparisonTargetInfo RIGHT = target("오른쪽 상권");
    private final CommercialQueryProcessor queries = mock(CommercialQueryProcessor.class);
    private final CommercialRegionQueryPort regions = mock(CommercialRegionQueryPort.class);
    private final CommercialComparisonQueryProcessor processor = new CommercialComparisonQueryProcessor(queries, regions);

    @Test
    void comparisonWinnerWithLowerSalesDoesNotClaimSalesOrDemandStability() {
        stubCommercial("left", 100, 10, 1, 100, 1000, 20);
        stubCommercial("right", 200, 5, 5, 200, 500, 10);

        CommercialComparisonInfo result = processor.compareCommercials(new CommercialComparisonQuery("left", "right", "service", "20261"));

        assertThat(result.recommendedSide().code()).isEqualTo("LEFT");
        assertThat(result.salesMetrics().getFirst().winnerSide().code()).isEqualTo("RIGHT");
        assertThat(result.recommendedReasons()).hasSize(3)
            .noneMatch(reason -> reason.contains("총 매출액") || reason.contains("월 평균 소득"))
            .anyMatch(reason -> reason.contains("폐업률") && reason.contains("1") && reason.contains("5"));
        assertThat(result.businessFitSummary()).doesNotContain("매출 잠재력", "수요 안정성");
    }

    @Test
    void equalMetricsProduceNeutralHighlights() {
        stubCommercial("left", 100, 5, 5, 100, 500, 10);
        stubCommercial("right", 100, 5, 5, 100, 500, 10);

        CommercialComparisonInfo result = processor.compareCommercials(new CommercialComparisonQuery("left", "right", "service", "20261"));

        assertThat(result.recommendedSide().code()).isEqualTo("TIE");
        assertThat(result.comparisonHighlights()).allMatch(reason -> reason.contains("같습니다"))
            .noneMatch(reason -> reason.contains("더 우세") || reason.contains("더 안정"));
        assertThat(result.highlights()).isEqualTo(result.comparisonHighlights());
    }

    private void stubCommercial(String code, long sales, double openingRate, double closureRate, long income, long population, long facilities) {
        when(queries.getSalesByPeriodCodeAndCommercialCodeAndServiceCode("20261", code, "service"))
            .thenReturn(CommercialSalesInfo.from(SalesCommercial.builder().commercialName(code).mondaySalesAmount(sales).build()));
        when(queries.getFootTrafficByPeriodCodeAndCommercialCode("20261", code))
            .thenReturn(CommercialFootTrafficInfo.from(FootTrafficCommercial.builder().build()));
        when(queries.getStoreByPeriodCodeAndCommercialCodeAndServiceCode("20261", code, "service"))
            .thenReturn(CommercialStoreAnalysisInfo.builder().openingRate(openingRate).closureRate(closureRate).build());
        when(queries.getIncomeByPeriodCodeAndCommercialCode("20261", code))
            .thenReturn(CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder().monthlyAverageIncomeAmount(income).build()));
        when(queries.getPopulationByPeriodAndCommercialCode("20261", code))
            .thenReturn(CommercialResidentPopulationInfo.from(PopulationCommercial.builder().totalResidentPopulation(population).build()));
        when(queries.getFacilityByPeriodAndCommercialCode("20261", code))
            .thenReturn(CommercialFacilityInfo.from(FacilityCommercial.builder().totalFacilityCount(facilities).build()));
        when(regions.getCommercialAdministration(code)).thenReturn(new CommercialAdministrationQueryResult("D", "district", "A", "administration"));
    }

    @Test
    void recommendedReasonsOnlyDescribeMetricsWonByRecommendedSide() {
        List<ComparisonMetricInfo> decisionMetrics = List.of(
            metric("총 매출액", ComparisonWinnerSide.RIGHT),
            metric("개업률", ComparisonWinnerSide.LEFT),
            metric("폐업률", ComparisonWinnerSide.LEFT),
            metric("월 평균 소득", ComparisonWinnerSide.RIGHT),
            metric("총 거주인구", ComparisonWinnerSide.LEFT),
            metric("총 시설 수", ComparisonWinnerSide.LEFT)
        );

        List<String> reasons = CommercialComparisonQueryProcessor.buildRecommendedReasons(
            LEFT, RIGHT, ComparisonWinnerSide.LEFT, decisionMetrics);

        assertThat(reasons)
            .hasSize(3)
            .allMatch(reason -> reason.contains("왼쪽 상권"))
            .noneMatch(reason -> reason.contains("총 매출액") || reason.contains("월 평균 소득"))
            .anyMatch(reason -> reason.contains("개업률"))
            .anyMatch(reason -> reason.contains("폐업률"))
            .anyMatch(reason -> reason.contains("총 거주인구"));
    }

    @Test
    void tiedRecommendationDoesNotClaimEitherCommercialWonSpecificMetrics() {
        List<String> reasons = CommercialComparisonQueryProcessor.buildRecommendedReasons(
            LEFT, RIGHT, ComparisonWinnerSide.TIE, List.of(
                metric("총 매출액", ComparisonWinnerSide.LEFT),
                metric("개업률", ComparisonWinnerSide.RIGHT)
            ));

        assertThat(reasons)
            .allMatch(reason -> reason.contains("두 상권"))
            .noneMatch(reason -> reason.contains("왼쪽 상권") || reason.contains("오른쪽 상권"));
    }

    private static CommercialComparisonTargetInfo target(String name) {
        return CommercialComparisonTargetInfo.builder().commercialName(name).build();
    }

    private static ComparisonMetricInfo metric(String label, ComparisonWinnerSide winnerSide) {
        return ComparisonMetricInfo.builder()
            .label(label)
            .winnerSide(winnerSide.toMetadata())
            .build();
    }
}
