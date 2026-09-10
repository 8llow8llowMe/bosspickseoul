package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.DatasetFootTrafficCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.LegacyFootTrafficCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.DatasetReadRouter;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FootTrafficCommercialRepositoryAdapterTest {

    private static final String CODE = "3110008";

    @Mock
    private DatasetReadRouter datasetReadRouter;

    @Mock
    private LegacyFootTrafficCommercialSource legacySource;

    @Mock
    private DatasetFootTrafficCommercialSource datasetSource;

    @InjectMocks
    private FootTrafficCommercialRepositoryAdapter adapter;

    @Test
    void singlePeriodRoutesByActiveRelease() {
        when(datasetReadRouter.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20241")).thenReturn(Optional.of("run-20241"));
        when(datasetSource.findByRunIdAndCommercialCode("run-20241", "20241", CODE)).thenReturn(Optional.of(traffic("20241")));

        assertThat(adapter.findByPeriodCodeAndCommercialCode("20241", CODE)).map(FootTrafficCommercial::periodCode).contains("20241");
        verify(legacySource, never()).findByPeriodCodeAndCommercialCode(any(), any());
    }

    @Test
    void mixedPeriodsAreSplitAndMergedForTheTrend() {
        // 최근 8분기 중 20232·20233 은 레거시, 20241·20242 는 데이터셋 — 한 요청에 두 소스가 섞이는 첫 경로
        Map<String, String> datasetRuns = new LinkedHashMap<>();
        datasetRuns.put("20241", "run-20241");
        datasetRuns.put("20242", "run-20242");
        List<String> periods = List.of("20232", "20233", "20241", "20242");
        when(datasetReadRouter.split(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, periods))
            .thenReturn(new DatasetReadRouter.Split(datasetRuns, List.of("20232", "20233")));
        when(legacySource.findByCommercialCodeAndPeriodCodeIn(CODE, List.of("20232", "20233")))
            .thenReturn(List.of(traffic("20232"), traffic("20233")));
        when(datasetSource.findAllByRunIdsAndCommercialCode(datasetRuns, CODE))
            .thenReturn(List.of(traffic("20241"), traffic("20242")));

        List<FootTrafficCommercial> found = adapter.findByCommercialCodeAndPeriodCodeIn(CODE, periods);

        assertThat(found).extracting(FootTrafficCommercial::periodCode).containsExactly("20232", "20233", "20241", "20242");
    }

    @Test
    void allLegacyPeriodsSkipTheDatasetSource() {
        List<String> periods = List.of("20232", "20233");
        when(datasetReadRouter.split(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, periods))
            .thenReturn(new DatasetReadRouter.Split(Map.of(), periods));
        when(legacySource.findByCommercialCodeAndPeriodCodeIn(CODE, periods)).thenReturn(List.of(traffic("20232"), traffic("20233")));

        assertThat(adapter.findByCommercialCodeAndPeriodCodeIn(CODE, periods)).hasSize(2);
        verify(datasetSource, never()).findAllByRunIdsAndCommercialCode(any(), anyString());
    }

    private static FootTrafficCommercial traffic(String periodCode) {
        return FootTrafficCommercial.builder()
            .periodCode(periodCode).commercialClassificationCode("A").commercialClassificationName("골목상권")
            .commercialCode(CODE).commercialName("배화여자대학교")
            .totalFootTraffic(1000).maleFootTraffic(500).femaleFootTraffic(500)
            .build();
    }
}
