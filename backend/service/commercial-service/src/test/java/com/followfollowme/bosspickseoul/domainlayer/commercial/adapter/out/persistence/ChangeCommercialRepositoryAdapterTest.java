package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.DatasetChangeCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.LegacyChangeCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.DatasetReadRouter;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChangeCommercialRepositoryAdapterTest {

    private static final List<String> CODES = List.of("3110008", "3110009");

    @Mock
    private DatasetReadRouter datasetReadRouter;

    @Mock
    private LegacyChangeCommercialSource legacySource;

    @Mock
    private DatasetChangeCommercialSource datasetSource;

    @InjectMocks
    private ChangeCommercialRepositoryAdapter adapter;

    @Test
    void legacyPeriodReadsTheLegacyTableOnly() {
        when(datasetReadRouter.datasetRunId(DatasetKey.CHANGE_COMMERCIAL, "20233")).thenReturn(Optional.empty());
        when(legacySource.findByPeriodCodeAndCommercialCode("20233", "3110008")).thenReturn(Optional.of(change("20233")));

        assertThat(adapter.findByPeriodCodeAndCommercialCode("20233", "3110008")).map(ChangeCommercial::periodCode).contains("20233");
        verifyNoInteractions(datasetSource);
    }

    @Test
    void datasetPeriodReadsTheActiveRunOnly() {
        when(datasetReadRouter.datasetRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).thenReturn(Optional.of("run-20241"));
        when(datasetSource.findAllByRunIdAndCommercialCodeIn("run-20241", "20241", CODES))
            .thenReturn(List.of(change("20241"), change("20241")));

        assertThat(adapter.findAllByPeriodCodeAndCommercialCodeIn("20241", CODES)).hasSize(2);
        verify(legacySource, never()).findAllByPeriodCodeAndCommercialCodeIn(anyString(), anyList());
    }

    @Test
    void datasetPeriodWithoutARowReturnsEmptyInsteadOfFallingBackToLegacy() {
        // 릴리스가 있는데 그 상권 행이 없으면 "없음" 이 맞는 답이다. 레거시로 떨어지면 다른 폴리곤 기준의 값이 섞인다.
        when(datasetReadRouter.datasetRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).thenReturn(Optional.of("run-20241"));
        when(datasetSource.findByRunIdAndCommercialCode("run-20241", "20241", "3110008")).thenReturn(Optional.empty());

        assertThat(adapter.findByPeriodCodeAndCommercialCode("20241", "3110008")).isEmpty();
        verify(legacySource, never()).findByPeriodCodeAndCommercialCode(any(), any());
    }

    private static ChangeCommercial change(String periodCode) {
        return ChangeCommercial.builder()
            .periodCode(periodCode).commercialClassificationCode("A").commercialClassificationName("골목상권")
            .commercialCode("3110008").commercialName("배화여자대학교").changeIndicatorCode("HH").changeIndicatorName("다이나믹")
            .averageOpenedMonths(108).averageClosedMonths(52)
            .build();
    }
}
