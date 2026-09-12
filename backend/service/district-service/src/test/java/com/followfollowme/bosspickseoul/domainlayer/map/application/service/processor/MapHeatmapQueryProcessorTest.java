package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 히트맵 요청의 단일지표 모드와 복합 모드 조합 검증을 4분기 매트릭스로 고정한다.
 *
 * <p>{@code composite} 하나로 두 모드가 갈리는데, 같이 오면 안 되는 파라미터가 모드마다 반대다.
 * 조건 네 개를 손으로 이어 붙인 형태라 하나를 뒤집거나 {@code &&} 를 {@code ||} 로 바꿔도 컴파일은
 * 통과한다. 그때 생기는 증상은 400 이 아니라, 검증을 빠져나간 요청이 {@code preset.name()} 이나
 * {@code metricType.name()} 에서 NPE(500)로 터지거나 무시된 파라미터가 조용히 버려지는 것이다.
 *
 * <p>검증이 원격 호출보다 <b>먼저</b> 일어나는지도 함께 고정한다. 순서가 뒤집히면 잘못된 요청마다
 * commercial-service 를 한 번씩 때리게 되고, 서킷 통계에도 실패로 잡힌다.
 */
@ExtendWith(MockitoExtension.class)
class MapHeatmapQueryProcessorTest {

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private CommercialHeatmapQueryPort commercialHeatmapQueryPort;

    @InjectMocks
    private MapHeatmapQueryProcessor mapHeatmapQueryProcessor;

    @Test
    @DisplayName("복합 모드인데 preset 이 없으면 MAP_002")
    void compositeWithoutPresetIsRejected() {
        assertErrorCode(
            () -> getHeatmap(null, null, null, true),
            MapErrorCode.HEATMAP_PRESET_REQUIRED
        );
    }

    @Test
    @DisplayName("단일 지표 모드인데 metricType 이 없으면 MAP_003")
    void singleMetricWithoutMetricTypeIsRejected() {
        assertErrorCode(
            () -> getHeatmap(null, null, null, false),
            MapErrorCode.HEATMAP_METRIC_TYPE_REQUIRED
        );
    }

    @Test
    @DisplayName("복합 모드에 metricType 을 함께 보내면 MAP_004")
    void compositeWithMetricTypeIsRejected() {
        assertErrorCode(
            () -> getHeatmap(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, CandidatePresetType.BALANCED, null, true),
            MapErrorCode.HEATMAP_METRIC_TYPE_NOT_ALLOWED
        );
    }

    @Test
    @DisplayName("단일 지표 모드에 preset 을 함께 보내면 MAP_005")
    void singleMetricWithPresetIsRejected() {
        assertErrorCode(
            () -> getHeatmap(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, CandidatePresetType.BALANCED, null, false),
            MapErrorCode.HEATMAP_PRESET_NOT_ALLOWED
        );
    }

    @Test
    @DisplayName("단일 지표 모드에 priorityMetric 을 함께 보내도 MAP_005")
    void singleMetricWithPriorityMetricIsRejected() {
        assertErrorCode(
            () -> getHeatmap(
                CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, CommercialHeatmapMetricType.RISK_SCORE, false
            ),
            MapErrorCode.HEATMAP_PRESET_NOT_ALLOWED
        );
    }

    @Test
    @DisplayName("잘못된 조합은 경계 조회와 원격 호출 전에 막힌다")
    void invalidCombinationDoesNotTouchPorts() {
        assertThatThrownBy(() -> getHeatmap(null, null, null, true)).isInstanceOf(MapException.class);

        verifyNoInteractions(mapQueryProcessor);
        verifyNoInteractions(commercialHeatmapQueryPort);
    }

    @Test
    @DisplayName("단일 지표 모드가 유효하면 단일 지표 점수 조회를 호출한다")
    void validSingleMetricCallsSingleMetricPort() {
        when(mapQueryProcessor.getAreaCoords(any(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());

        CommercialHeatmapResponseInfo info =
            getHeatmap(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, null, false);

        verify(commercialHeatmapQueryPort).getHeatmapScores(List.of(), "CS100001", "OPPORTUNITY_SCORE", "20233");
        verify(commercialHeatmapQueryPort, never()).getCompositeHeatmapScores(any(), any(), any(), any(), any());
        // 하위 응답이 없어도 모드/지표 메타데이터는 요청 기준으로 채워 내려간다.
        assertThat(info.mode().code()).isEqualTo(HeatmapModeType.SINGLE_METRIC.name());
        assertThat(info.metricType().code()).isEqualTo(CommercialHeatmapMetricType.OPPORTUNITY_SCORE.name());
        assertThat(info.areas()).isEmpty();
    }

    @Test
    @DisplayName("복합 모드가 유효하면 복합 점수 조회를 호출한다")
    void validCompositeCallsCompositePort() {
        when(mapQueryProcessor.getAreaCoords(any(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());

        CommercialHeatmapResponseInfo info = getHeatmap(null, CandidatePresetType.STABLE_LOW_RISK, null, true);

        verify(commercialHeatmapQueryPort).getCompositeHeatmapScores(List.of(), "CS100001", "STABLE_LOW_RISK", null, "20233");
        verify(commercialHeatmapQueryPort, never()).getHeatmapScores(any(), any(), any(), any());
        assertThat(info.mode().code()).isEqualTo(HeatmapModeType.COMPOSITE.name());
        assertThat(info.preset().code()).isEqualTo(CandidatePresetType.STABLE_LOW_RISK.name());
    }

    private CommercialHeatmapResponseInfo getHeatmap(
        CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, boolean composite
    ) {
        return mapHeatmapQueryProcessor.getCommercialHeatmap(
            127.0, 37.5, 127.1, 37.6, "CS100001", "20233", metricType, preset, priorityMetric, composite
        );
    }

    private static void assertErrorCode(ThrowingCallable callable, MapErrorCode expected) {
        assertThatThrownBy(callable)
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(expected);
    }
}
