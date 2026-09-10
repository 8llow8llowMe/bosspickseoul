package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DatasetReadRouterTest {

    @Mock
    private DatasetReleaseResolver resolver;

    @Test
    void disabledFlagRoutesEveryPeriodToLegacyWithoutAskingTheResolver() {
        DatasetReadRouter router = new DatasetReadRouter(properties(false, "20241"), resolver);

        assertThat(router.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20241")).isEmpty();
        verify(resolver, never()).activeRunId(any(), anyString());
    }

    @Test
    void periodsBeforeTheCutoffStayOnLegacyEvenIfAReleaseExists() {
        DatasetReadRouter router = new DatasetReadRouter(properties(true, "20241"), resolver);

        assertThat(router.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20233")).isEmpty();
        verify(resolver, never()).activeRunId(any(), anyString());
    }

    @Test
    void periodsFromTheCutoffUseTheActiveReleaseWhenPresent() {
        when(resolver.activeRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20241")).thenReturn(Optional.of("run-20241"));
        when(resolver.activeRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20242")).thenReturn(Optional.empty());
        DatasetReadRouter router = new DatasetReadRouter(properties(true, "20241"), resolver);

        assertThat(router.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20241")).contains("run-20241");
        // 컷오프 이후지만 아직 게시되지 않은 분기는 레거시로 간다 (그곳에 없으면 결과가 빈 것이 맞다)
        assertThat(router.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20242")).isEmpty();
    }

    @Test
    void splitKeepsInputOrderAndSeparatesMixedPeriods() {
        when(resolver.activeRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20241")).thenReturn(Optional.of("run-20241"));
        when(resolver.activeRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, "20242")).thenReturn(Optional.of("run-20242"));
        DatasetReadRouter router = new DatasetReadRouter(properties(true, "20241"), resolver);

        DatasetReadRouter.Split split = router.split(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, List.of("20232", "20233", "20241", "20242"));

        assertThat(split.legacyPeriods()).containsExactly("20232", "20233");
        assertThat(split.datasetRunsByPeriod()).containsExactly(
            java.util.Map.entry("20241", "run-20241"), java.util.Map.entry("20242", "run-20242"));
        assertThat(split.hasLegacy()).isTrue();
        assertThat(split.hasDataset()).isTrue();
    }

    private static DatasetReadProperties properties(boolean enabled, String readFromPeriod) {
        return new DatasetReadProperties(enabled, "legacy-20233", "seoul-v1", readFromPeriod, Duration.ofSeconds(60));
    }
}
