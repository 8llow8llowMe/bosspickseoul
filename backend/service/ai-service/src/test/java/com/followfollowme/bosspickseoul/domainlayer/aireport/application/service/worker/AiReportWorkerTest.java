package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiReportWorkerTest {

    @Mock
    private AiReportJobStorePort jobStore;

    @Mock
    private AiReportJobEventPort jobEventPort;

    @Mock
    private AiReportProcessor processor;

    @Mock
    private AiUsageCounterPort usageCounter;

    @InjectMocks
    private AiReportWorker worker;

    @Test
    void runJob_success_embedsReportAndRecordsUsageAndReleasesIdempotency() {
        AiReportJob pending = pendingJob();
        CommercialAiReportInfo report = mock(CommercialAiReportInfo.class);
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        AiUsageMeta usage = new AiUsageMeta("ollama", 100, 50);
        when(processor.generateCommercialReport("C", "S", "P"))
            .thenReturn(new AiGenerationResult<>(report, usage));

        worker.runJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.COMPLETED && j.commercialReport() == report
        ));
        verify(usageCounter).record(eq(7L), eq(usage));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
        // RUNNING 전이 1회 + 종결(COMPLETED) 1회 발행으로 SSE 구독자가 상태 변화를 감지한다.
        verify(jobEventPort, times(2)).publishJobUpdated("J1");
    }

    @Test
    void runJob_aiException_savesFailedWithDomainCodeAndReleasesIdempotency() {
        AiReportJob pending = pendingJob();
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateCommercialReport(any(), any(), any()))
            .thenThrow(new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE));

        worker.runJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.LLM_UNAVAILABLE.getCode().equals(j.errorCode())
                && AiReportErrorCode.LLM_UNAVAILABLE.getMessage().equals(j.errorMessage())
        ));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
        verify(usageCounter, never()).record(any(), any());
    }

    @Test
    void runJob_unexpectedException_savesFailedWithSanitizedMessage() {
        AiReportJob pending = pendingJob();
        String secretLeak = "internal db password=hunter2";
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateCommercialReport(any(), any(), any()))
            .thenThrow(new RuntimeException(secretLeak));

        worker.runJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.JOB_FAILED.getCode().equals(j.errorCode())
                && AiReportErrorCode.JOB_FAILED.getMessage().equals(j.errorMessage())
                && (j.errorMessage() == null || !j.errorMessage().contains("hunter2"))
        ));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runJob_jobMissing_returnsSilentlyWithoutSideEffects() {
        when(jobStore.findById("J1")).thenReturn(Optional.empty());

        worker.runJob("J1");

        verify(jobStore).findById("J1");
        verifyNoMoreInteractions(jobStore);
        verifyNoInteractions(processor, usageCounter, jobEventPort);
    }

    @Test
    void runJob_alreadyAdvanced_skipsTransition() {
        AiReportJob completed = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED).createdAt(Instant.now()).build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(completed));

        worker.runJob("J1");

        verify(jobStore).findById("J1");
        verify(jobStore, never()).save(any());
        verify(jobStore, never()).releaseIdempotencyKey(any(), anyString());
        verifyNoInteractions(processor, usageCounter);
    }

    @Test
    void runJob_pickupFailure_returnsSilentlyWithoutSave() {
        when(jobStore.findById("J1"))
            .thenThrow(new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE));

        worker.runJob("J1");

        verify(jobStore, atLeastOnce()).findById("J1");
        verify(jobStore, never()).save(any());
        verifyNoInteractions(processor, usageCounter);
    }

    private AiReportJob pendingJob() {
        return AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
    }

    private Map<String, String> commercialParams() {
        return Map.of("commercialCode", "C", "serviceCode", "S", "periodCode", "P");
    }
}
