package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationByAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreCountsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommercialHeatmapQueryProcessorTest {

    @Mock
    private CommercialQueryProcessor commercialQueryProcessor;

    @Mock
    private ChangeCommercialRepositoryPort changeCommercialRepositoryPort;

    @InjectMocks
    private CommercialHeatmapQueryProcessor processor;

    @Test
    void getAllMetricScores_sourceDataMissing_excludesCommercialInsteadOfFailingWholeRequest() {
        // 특정 상권×업종 조합의 매출 데이터가 없으면 도메인 예외(COMMERCIAL_007)가 발생하는데,
        // 이때 요청 전체가 404로 실패하지 않고 해당 상권만 점수 산정에서 제외되어야 한다. (회귀 방지)
        // 벌크 조회가 빈 맵을 돌려주는 것이 곧 「그 상권의 데이터가 없다」는 신호다.
        // 예전에는 단건 조회가 COMMERCIAL_007 예외를 던졌고 Processor 가 그것을 잡았다.
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of());

        List<CommercialAllMetricScoresInfo> scores =
            processor.getAllMetricScores("20233", "CS100001", List.of("C1", "C2"));

        assertThat(scores).hasSize(2);
        assertThat(scores).allSatisfy(entry ->
            assertThat(entry.scoresByMetric().values()).allSatisfy(score -> {
                assertThat(score.score()).isNull();
                assertThat(score.grade()).isEqualTo("INSUFFICIENT");
            })
        );
    }

    @Test
    @DisplayName("단일 지표 응답은 점수뿐 아니라 mode·metricType·summary 메타데이터까지 채워 돌려준다")
    void getHeatmapScores_fillsResponseMetadata() {
        // 이 조립은 원래 Facade 에 있었다. Processor 로 내리면서 필드가 빠지면 화면 메타데이터가
        // 조용히 비므로 여기서 못 박는다. 복합 지표 경로는 CommercialCandidateQueryProcessor 가
        // 같은 타입을 따로 만든다 — 필드를 추가할 때는 양쪽을 함께 봐야 한다.
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());

        CommercialHeatmapScoresResponseInfo info = processor.getHeatmapScores(
            "20233", "CS100001", List.of("C1", "C2"), CommercialHeatmapMetricType.OPPORTUNITY_SCORE);

        assertThat(info.mode()).isNotNull();
        assertThat(info.mode().code()).isEqualTo(HeatmapModeType.SINGLE_METRIC.name());
        assertThat(info.periodCode()).isEqualTo("20233");
        assertThat(info.serviceCode()).isEqualTo("CS100001");
        assertThat(info.metricType()).isNotNull();
        assertThat(info.summary()).contains(CommercialHeatmapMetricType.OPPORTUNITY_SCORE.getDisplayName());
        assertThat(info.scores()).hasSize(2);
        // 단일 지표 응답에는 복합 전용 필드가 붙지 않는다.
        assertThat(info.preset()).isNull();
        assertThat(info.priorityMetric()).isNull();
    }

    @Test
    @DisplayName("원천 조회 횟수는 상권 수와 무관하게 고정이다")
    void loadSources_queryCountDoesNotGrowWithCommercialCount() {
        // #404. 예전에는 상권 코드마다 단건 조회 7회(매출·유동인구·점포·점포의 동종업종 피어·
        // 상주인구·소득·집객시설)를 던져 코드 50개면 350회였다. 지금은 종류당 1회씩만 나간다.
        // 이 테스트가 깨졌다면 loadSources 안에 다시 루프가 생긴 것이다.
        //
        // 마지막의 verifyNoMoreInteractions 가 「여기 열거한 것 외에는 아무것도 조회하지 않는다」를 고정한다.
        // 소득소비 벌크 조회는 점수식에서 지출 항이 빠진 뒤 결과를 읽는 곳이 없는데도 매 요청 돌고 있었다. (이슈 #415)
        List<String> fiftyCodes = IntStream.range(0, 50).mapToObj(index -> "C" + index).toList();
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());

        processor.getAllMetricScores("20233", "CS100001", fiftyCodes);

        verify(changeCommercialRepositoryPort, times(1)).findAllByPeriodCodeAndCommercialCodeIn(anyString(), any());
        verify(commercialQueryProcessor, times(1))
            .getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString());
        verify(commercialQueryProcessor, times(1)).getFootTrafficByPeriodCodeAndCommercialCodes(anyString(), any());
        verify(commercialQueryProcessor, times(1))
            .getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString());
        verify(commercialQueryProcessor, times(1)).getPopulationByPeriodCodeAndCommercialCodes(anyString(), any());
        verify(commercialQueryProcessor, times(1)).getFacilityByPeriodCodeAndCommercialCodes(anyString(), any());

        // 단건 경로는 한 번도 타지 않는다. 피어 조회를 품은 getStoreBy... 가 특히 중요하다.
        verify(commercialQueryProcessor, never())
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(anyString(), anyString(), anyString());
        verify(commercialQueryProcessor, never())
            .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(anyString(), anyString(), anyString());
        verifyNoMoreInteractions(commercialQueryProcessor);
    }

    @Test
    @DisplayName("상권 코드가 비면 조회를 아예 하지 않는다")
    void loadSources_emptyCommercialCodes_skipsQueries() {
        List<CommercialAllMetricScoresInfo> scores = processor.getAllMetricScores("20233", "CS100001", List.of());

        assertThat(scores).isEmpty();
        verify(changeCommercialRepositoryPort, never()).findAllByPeriodCodeAndCommercialCodeIn(anyString(), any());
        verify(commercialQueryProcessor, never())
            .getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("요약 라벨은 데이터가 없는 갈래에서도 지표명을 품는다")
    void buildSummaryLabel_alwaysCarriesTheMetricName() {
        // 이 라벨은 지표명 없이 나열되는 자리(후보 추천 문장)에도 쓰이므로, 어느 갈래에서든
        // 지표명이 빠지면 "데이터 부족 · 데이터 부족" 처럼 무엇이 없는지 알 수 없게 된다.
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            for (Double score : new Double[] {null, 85D, 55D, 10D}) {
                assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(metric, score))
                    .isNotEqualTo("데이터 부족")
                    .isNotBlank();
            }
        }
    }

    @Test
    @DisplayName("점수 구간별로 등급 낱말이 붙고, 점수가 없으면 데이터 부족으로 표시한다")
    void buildSummaryLabel_mapsScoreRangesToStateWords() {
        CommercialHeatmapMetricType opportunity = CommercialHeatmapMetricType.OPPORTUNITY_SCORE;

        assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(opportunity, 85D)).isEqualTo("기회도 높음");
        assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(opportunity, 55D)).isEqualTo("기회도 보통");
        assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(opportunity, 10D)).isEqualTo("기회도 낮음");
        assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(opportunity, null)).isEqualTo("기회도 데이터 부족");

        assertThat(CommercialHeatmapQueryProcessor.buildSummaryLabel(
            CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE, null)).isEqualTo("거주 수요 데이터 부족");
    }

    @Test
    @DisplayName("소득소비 행이 없는 상권도 히트맵에서 빠지지 않고 네 지표 모두 점수를 받는다")
    void getAllMetricScores_missingIncomeRow_stillScoresCommercial() {
        // 2024년 이후 1,650개 상권 중 560곳은 소득소비 행 자체가 없다. 소득 지표가 걷히고 지출이
        // null 허용이 된 뒤로는 그 행의 유무가 어느 지표도 좌우하지 않는데, buildSource 게이트에
        // income == null 이 남아 있어 그 560곳이 네 지표 전부 INSUFFICIENT 로 빠져 지도에서 사라졌다. (이슈 #413)
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", sales("상권1", 100L), "C2", sales("상권2", 200L)));
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", footTraffic(50L), "C2", footTraffic(100L)));
        when(commercialQueryProcessor.getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", storeCounts(10L, 0.1D), "C2", storeCounts(20L, 0.2D)));
        when(commercialQueryProcessor.getPopulationByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", population(1_000L), "C2", population(2_000L)));
        when(commercialQueryProcessor.getFacilityByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", facility(3L), "C2", facility(6L)));

        List<CommercialAllMetricScoresInfo> scores =
            processor.getAllMetricScores("20261", "CS100001", List.of("C1", "C2"));

        assertThat(scores).hasSize(2);
        assertThat(scores).allSatisfy(entry ->
            assertThat(entry.scoresByMetric().values()).allSatisfy(score -> {
                assertThat(score.score()).isNotNull();
                assertThat(score.grade()).isNotEqualTo("INSUFFICIENT");
            })
        );
        assertThat(scores).anySatisfy(entry -> assertThat(entry.commercialName()).isEqualTo("상권2"));
    }

    @Test
    @DisplayName("지출이 있는 상권과 없는 상권이 섞인 분기에도 기회도 점수가 갈리지 않는다")
    void getAllMetricScores_mixedIncomeCoverage_doesNotPenalizeCommercialsWithoutExpense() {
        // 이슈 #413: 20234 는 1,650곳 중 1,089곳만 지출 값이 있고 레거시 분기에도 전 항목 0 인 상권이 35곳이다.
        // 기회도에 지출 항을 남겨 두면 결측 상권만 그 항에서 영구히 0 점을 받고, 그 0 이 MetricRange.min 을
        // 끌어내려 나머지 상권의 정규화 점수까지 위로 압축한다. 이 점수는 후보 추천으로도 흘러간다.
        // 나머지 네 원천이 같은 두 상권은 소득소비 행 유무와 무관하게 같은 기회도를 받아야 한다.
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", sales("상권1", 100L), "C2", sales("상권2", 100L)));
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", footTraffic(50L), "C2", footTraffic(50L)));
        when(commercialQueryProcessor.getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", storeCounts(10L, 0.1D), "C2", storeCounts(10L, 0.1D)));
        when(commercialQueryProcessor.getPopulationByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", population(1_000L), "C2", population(1_000L)));
        when(commercialQueryProcessor.getFacilityByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", facility(3L), "C2", facility(3L)));

        CommercialHeatmapScoresResponseInfo info = processor.getHeatmapScores(
            "20234", "CS100001", List.of("C1", "C2"), CommercialHeatmapMetricType.OPPORTUNITY_SCORE);

        assertThat(info.scores()).hasSize(2);
        assertThat(info.scores()).extracting(score -> score.score()).containsExactly(50D, 50D);
        assertThat(info.scores()).allSatisfy(score -> assertThat(score.grade()).isNotEqualTo("INSUFFICIENT"));
    }

    @Test
    @DisplayName("소득소비 행이 아예 없어도 기회도는 나머지 네 항목으로 계산된다")
    void getAllMetricScores_noIncomeRowAtAll_opportunityStillScores() {
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", sales("상권1", 100L)));
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", footTraffic(50L)));
        when(commercialQueryProcessor.getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(anyString(), any(), anyString()))
            .thenReturn(Map.of("C1", storeCounts(10L, 0.1D)));
        when(commercialQueryProcessor.getPopulationByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", population(1_000L)));
        when(commercialQueryProcessor.getFacilityByPeriodCodeAndCommercialCodes(anyString(), any()))
            .thenReturn(Map.of("C1", facility(3L)));

        CommercialHeatmapScoresResponseInfo info = processor.getHeatmapScores(
            "20261", "CS100001", List.of("C1"), CommercialHeatmapMetricType.OPPORTUNITY_SCORE);

        assertThat(info.scores()).hasSize(1);
        // 상권이 하나뿐이라 정규화 구간이 무너져 기본값 50 이 된다. 중요한 것은 null(=INSUFFICIENT)이 아니라는 점이다.
        assertThat(info.scores().get(0).score()).isEqualTo(50D);
        assertThat(info.scores().get(0).grade()).isNotEqualTo("INSUFFICIENT");
    }

    private static CommercialSalesInfo sales(String commercialName, long dailySalesAmount) {
        return CommercialSalesInfo.builder()
            .commercialName(commercialName)
            .amountByTimeSlotInfo(CommercialSalesByTimeSlotInfo.builder()
                .salesAmountTime00To06(dailySalesAmount)
                .salesAmountTime21To24(dailySalesAmount)
                .build())
            .amountByDayOfWeekInfo(CommercialSalesByDayOfWeekInfo.builder()
                .mondaySalesAmount(dailySalesAmount)
                .tuesdaySalesAmount(dailySalesAmount)
                .wednesdaySalesAmount(dailySalesAmount)
                .thursdaySalesAmount(dailySalesAmount)
                .fridaySalesAmount(dailySalesAmount)
                .saturdaySalesAmount(dailySalesAmount)
                .sundaySalesAmount(dailySalesAmount)
                .build())
            .build();
    }

    private static CommercialFootTrafficInfo footTraffic(long dailyFootTraffic) {
        return CommercialFootTrafficInfo.builder()
            .byDayOfWeekInfo(CommercialFootTrafficByDayOfWeekInfo.builder()
                .mondayFootTraffic(dailyFootTraffic)
                .tuesdayFootTraffic(dailyFootTraffic)
                .wednesdayFootTraffic(dailyFootTraffic)
                .thursdayFootTraffic(dailyFootTraffic)
                .fridayFootTraffic(dailyFootTraffic)
                .saturdayFootTraffic(dailyFootTraffic)
                .sundayFootTraffic(dailyFootTraffic)
                .build())
            .build();
    }

    private static CommercialStoreCountsInfo storeCounts(long totalStoreCount, double rate) {
        return CommercialStoreCountsInfo.builder()
            .totalStoreCount(totalStoreCount)
            .similarStoreCount(totalStoreCount / 2)
            .openingRate(rate)
            .closureRate(rate / 2)
            .build();
    }

    private static CommercialResidentPopulationInfo population(long totalResidentPopulation) {
        return CommercialResidentPopulationInfo.builder()
            .byAgeInfo(CommercialResidentPopulationByAgeInfo.builder()
                .totalResidentPopulation(totalResidentPopulation)
                .build())
            .build();
    }

    private static CommercialFacilityInfo facility(long totalFacilityCount) {
        return CommercialFacilityInfo.builder()
            .totalFacilityCount(totalFacilityCount)
            .build();
    }
}
