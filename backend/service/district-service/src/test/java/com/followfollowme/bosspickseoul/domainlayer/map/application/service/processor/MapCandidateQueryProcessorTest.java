package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 비교 후보 요청의 {@code topN} 허용 범위를 경계값으로 고정한다.
 *
 * <p>허용 범위는 코드 상수 두 개(5, 30)로만 존재하고 DTO 검증 어노테이션이 없다. 부등호를
 * {@code <} 와 {@code <=} 사이에서 한 칸 옮겨도 컴파일은 통과하며, 5나 30 같은 딱 경계값을 손으로
 * 눌러보지 않으면 드러나지 않는다. 범위를 벗어난 값이 그대로 통과하면 commercial-service 로
 * 그대로 넘어가 상대 서비스의 400 이 MAP_008(503)로 둔갑한다.
 *
 * <p>{@code topN} 을 지정하지 않았을 때의 기본값 폴백(10)도 함께 고정한다. 여기서 막히면
 * 프런트가 값을 안 보낸 모든 요청이 400 이 된다.
 */
@ExtendWith(MockitoExtension.class)
class MapCandidateQueryProcessorTest {

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private CommercialCandidateQueryPort commercialCandidateQueryPort;

    @InjectMocks
    private MapCandidateQueryProcessor mapCandidateQueryProcessor;

    @Test
    @DisplayName("topN 이 하한(5)보다 작으면 MAP_001")
    void belowMinTopNIsRejected() {
        assertThatThrownBy(() -> getCandidates(4))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.INVALID_TOP_N);
    }

    @Test
    @DisplayName("topN 이 상한(30)보다 크면 MAP_001")
    void aboveMaxTopNIsRejected() {
        assertThatThrownBy(() -> getCandidates(31))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.INVALID_TOP_N);
    }

    @Test
    @DisplayName("topN 하한값 5는 그대로 통과한다")
    void minTopNIsAccepted() {
        stubEmptyViewport();

        assertThatCode(() -> getCandidates(5)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("topN 상한값 30은 그대로 통과한다")
    void maxTopNIsAccepted() {
        stubEmptyViewport();

        assertThatCode(() -> getCandidates(30)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("topN 을 지정하지 않으면 기본값 10으로 응답한다")
    void nullTopNFallsBackToDefault() {
        stubEmptyViewport();

        CandidateCommercialsResponseInfo info = getCandidates(null);

        assertThat(info.topN()).isEqualTo(10);
        assertThat(info.items()).isEmpty();
    }

    @Test
    @DisplayName("범위를 벗어난 topN 은 경계 조회와 원격 호출 전에 막힌다")
    void invalidTopNDoesNotTouchPorts() {
        assertThatThrownBy(() -> getCandidates(31)).isInstanceOf(MapException.class);

        verifyNoInteractions(mapQueryProcessor);
        verifyNoInteractions(commercialCandidateQueryPort);
    }

    @Test
    @DisplayName("우선 지표를 지정하지 않으면 프리셋 기본 지표로 응답한다")
    void nullPriorityMetricFallsBackToPresetDefault() {
        stubEmptyViewport();

        CandidateCommercialsResponseInfo info = mapCandidateQueryProcessor.getCandidateCommercials(
            127.0, 37.5, 127.1, 37.6, "CS100001", "20233", CandidatePresetType.STABLE_LOW_RISK, null, 10
        );

        assertThat(info.priorityMetric().code()).isEqualTo(CommercialHeatmapMetricType.RISK_SCORE.name());
    }

    @Test
    @DisplayName("프리셋 목록은 enum 전체를 기본 우선 지표와 함께 내려준다")
    void presetsExposeEveryEnumValue() {
        List<CandidatePresetInfo> presets = mapCandidateQueryProcessor.getCandidatePresets();

        assertThat(presets).hasSize(CandidatePresetType.values().length);
        assertThat(presets.stream().map(preset -> preset.preset().code()).toList())
            .containsExactlyElementsOf(Arrays.stream(CandidatePresetType.values()).map(Enum::name).toList());
        assertThat(presets.get(0).defaultPriorityMetric().code())
            .isEqualTo(CandidatePresetType.values()[0].getDefaultPriorityMetric().name());
    }

    private void stubEmptyViewport() {
        // 뷰포트가 비면 원격 호출 없이 빈 응답을 만든다. topN 검증 경계만 보려는 테스트라 그 경로를 쓴다.
        when(mapQueryProcessor.getAreaCoords(any(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());
    }

    private CandidateCommercialsResponseInfo getCandidates(Integer topN) {
        return mapCandidateQueryProcessor.getCandidateCommercials(
            127.0, 37.5, 127.1, 37.6, "CS100001", "20233", CandidatePresetType.BALANCED, null, topN
        );
    }
}
