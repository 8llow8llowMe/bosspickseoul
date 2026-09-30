package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshRunProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Facade 는 run 조립을 Processor 에 맡기고 요약만 남긴다. 예산·순서는 DatasetRefreshRunProcessorTest 가 본다. */
class DatasetRefreshFacadeTest {

    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z");

    private final DatasetRefreshRunProcessor runProcessor = mock(DatasetRefreshRunProcessor.class);
    private final DatasetRefreshFacade facade = new DatasetRefreshFacade(runProcessor);

    @Test
    void delegatesTheWholeRunAndReturnsItsSummary() {
        DatasetRefreshSummary summary = new DatasetRefreshSummary(FIRED, false, 3,
            List.of(new DatasetRefreshSlot(Dataset.SALES_COMMERCIAL, null, DatasetRefreshResult.NOT_PUBLISHED_YET, "")));
        when(runProcessor.refreshAll(FIRED)).thenReturn(summary);

        assertThat(facade.refresh(FIRED)).isSameAs(summary);
        verify(runProcessor).refreshAll(FIRED);
        verifyNoMoreInteractions(runProcessor);
    }
}
