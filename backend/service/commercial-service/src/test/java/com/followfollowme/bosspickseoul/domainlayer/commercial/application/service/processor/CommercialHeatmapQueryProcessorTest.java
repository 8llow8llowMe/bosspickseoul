package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.List;
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
        when(changeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCodeIn(anyString(), any()))
            .thenReturn(List.of());
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(anyString(), anyString(), anyString()))
            .thenThrow(new CommercialException(CommercialErrorCode.SALES_NOT_FOUND));

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
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(anyString(), anyString(), anyString()))
            .thenThrow(new CommercialException(CommercialErrorCode.SALES_NOT_FOUND));

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
}
