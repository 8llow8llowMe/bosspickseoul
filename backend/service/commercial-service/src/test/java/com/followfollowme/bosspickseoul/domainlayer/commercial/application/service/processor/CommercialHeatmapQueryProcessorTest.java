package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import java.util.List;
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
}
