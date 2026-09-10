package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TypedFactProjectionProcessorTest {

    @Mock
    private TypedFactProjectionPort projections;

    private TypedFactProjectionProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new TypedFactProjectionProcessor(projections);
    }

    @Test
    void dryRunMapsRowsWithoutWriting() {
        ProjectionRequest request = request(true);
        when(projections.activeRunId(request)).thenReturn(Optional.of("change-commercial-20241-002"));
        when(projections.facts("change-commercial-20241-002")).thenReturn(List.of(fact()));

        ProjectionResult result = processor.project(request);

        assertThat(result.sourceRunId()).isEqualTo("change-commercial-20241-002");
        assertThat(result.rowCount()).isEqualTo(1);
        assertThat(result.written()).isFalse();
        verify(projections, never()).replaceChangeCommercial(any(), anyList());
    }

    @Test
    void publishWritesMappedRows() {
        ProjectionRequest request = request(false);
        when(projections.activeRunId(request)).thenReturn(Optional.of("change-commercial-20241-002"));
        when(projections.facts("change-commercial-20241-002")).thenReturn(List.of(fact()));
        when(projections.replaceChangeCommercial(eq(request), anyList())).thenReturn(1);

        assertThat(processor.project(request).written()).isTrue();
        verify(projections).replaceChangeCommercial(eq(request), anyList());
    }

    @Test
    void otherDatasetsAreOutOfScope() {
        ProjectionRequest request = new ProjectionRequest(
            "project-sales-20241-001", Dataset.SALES_COMMERCIAL, new Quarter("20241"),
            "legacy-20233", "seoul-v1", true);
        assertThatThrownBy(() -> processor.project(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("CHANGE_COMMERCIAL");
    }

    private static ProjectionRequest request(boolean dryRun) {
        return new ProjectionRequest(
            "project-change-commercial-20241-001", Dataset.CHANGE_COMMERCIAL, new Quarter("20241"),
            "legacy-20233", "seoul-v1", dryRun);
    }

    private static FactRow fact() {
        return new FactRow(1L, "3110008", "", Map.of(
            "STDR_YYQU_CD", "20241",
            "TRDAR_SE_CD", "A",
            "TRDAR_SE_CD_NM", "골목상권",
            "TRDAR_CD_NM", "배화여자대학교",
            "TRDAR_CHNGE_IX", "HH",
            "TRDAR_CHNGE_IX_NM", "다이나믹",
            "OPR_SALE_MT_AVRG", "108",
            "CLS_SALE_MT_AVRG", "52"
        ));
    }
}
