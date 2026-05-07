package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;
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
    private AiReportProcessor processor;

    @Mock
    private AiUsageCounterPort usageCounter;

    @InjectMocks
    private AiReportWorker worker;

    @Test
    void runCommercialJob_success_embedsReportAndRecordsUsageAndReleasesIdempotency() {
        AiReportJob pending = pendingJob();
        CommercialAiReportInfo report = mock(CommercialAiReportInfo.class);
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        AiUsageMeta usage = new AiUsageMeta("ollama", 100, 50);
        when(processor.generateCommercialReport("C", "S", "P"))
            .thenReturn(new AiGenerationResult<>(report, usage));

        worker.runCommercialJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.COMPLETED && j.commercialReport() == report
        ));
        verify(usageCounter).record(eq(7L), eq(usage));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runCommercialJob_aiException_savesFailedWithDomainCodeAndReleasesIdempotency() {
        AiReportJob pending = pendingJob();
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateCommercialReport(any(), any(), any()))
            .thenThrow(new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE));

        worker.runCommercialJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.LLM_UNAVAILABLE.getCode().equals(j.errorCode())
                && AiReportErrorCode.LLM_UNAVAILABLE.getMessage().equals(j.errorMessage())
        ));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
        verify(usageCounter, never()).record(any(), any());
    }

    @Test
    void runCommercialJob_unexpectedException_savesFailedWithSanitizedMessage() {
        AiReportJob pending = pendingJob();
        String secretLeak = "internal db password=hunter2";
        when(jobStore.findById("J1")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateCommercialReport(any(), any(), any()))
            .thenThrow(new RuntimeException(secretLeak));

        worker.runCommercialJob("J1");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.JOB_FAILED.getCode().equals(j.errorCode())
                && AiReportErrorCode.JOB_FAILED.getMessage().equals(j.errorMessage())
                && (j.errorMessage() == null || !j.errorMessage().contains("hunter2"))
        ));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runCommercialJob_jobMissing_returnsSilentlyWithoutSideEffects() {
        when(jobStore.findById("J1")).thenReturn(Optional.empty());

        worker.runCommercialJob("J1");

        verify(jobStore).findById("J1");
        verifyNoMoreInteractions(jobStore);
        verifyNoInteractions(processor, usageCounter);
    }

    @Test
    void runCommercialJob_alreadyAdvanced_skipsTransition() {
        AiReportJob completed = AiReportJob.builder()
            .jobId("J1").userId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED).createdAt(Instant.now()).build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(completed));

        worker.runCommercialJob("J1");

        verify(jobStore).findById("J1");
        verify(jobStore, never()).save(any());
        verify(jobStore, never()).releaseIdempotencyKey(any(), anyString());
        verifyNoInteractions(processor, usageCounter);
    }

    @Test
    void runCommercialJob_pickupFailure_returnsSilentlyWithoutSave() {
        when(jobStore.findById("J1"))
            .thenThrow(new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE));

        worker.runCommercialJob("J1");

        verify(jobStore, atLeastOnce()).findById("J1");
        verify(jobStore, never()).save(any());
        verifyNoInteractions(processor, usageCounter);
    }

    // --- 비교/자치구/행정동 워커 ---

    @Test
    void runCommercialComparisonJob_success_embedsComparisonReportAndRecordsUsage() {
        AiReportJob pending = AiReportJob.builder()
            .jobId("J2").userId(7L).jobType(AiReportJobType.COMMERCIAL_COMPARISON).requestHash("H")
            .requestParams(Map.of(
                "leftCommercialCode", "L",
                "rightCommercialCode", "R",
                "serviceCode", "S",
                "periodCode", "P"
            ))
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
        CommercialComparisonAiReportInfo report = mock(CommercialComparisonAiReportInfo.class);
        AiUsageMeta usage = new AiUsageMeta("ollama", 100, 50);
        when(jobStore.findById("J2")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateCommercialComparisonReport(any(CommercialComparisonAiQuery.class)))
            .thenReturn(new AiGenerationResult<>(report, usage));

        worker.runCommercialComparisonJob("J2");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.COMPLETED && j.comparisonReport() == report
        ));
        verify(usageCounter).record(eq(7L), eq(usage));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runDistrictJob_success_embedsDistrictReportAndRecordsUsage() {
        AiReportJob pending = AiReportJob.builder()
            .jobId("J3").userId(7L).jobType(AiReportJobType.DISTRICT).requestHash("H")
            .requestParams(Map.of("districtCode", "D", "periodCode", "P"))
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
        DistrictAiReportInfo report = mock(DistrictAiReportInfo.class);
        AiUsageMeta usage = new AiUsageMeta("ollama", 80, 40);
        when(jobStore.findById("J3")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateDistrictReport("D", "P"))
            .thenReturn(new AiGenerationResult<>(report, usage));

        worker.runDistrictJob("J3");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.COMPLETED && j.districtReport() == report
        ));
        verify(usageCounter).record(eq(7L), eq(usage));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runAdministrationJob_success_embedsAdministrationReportAndRecordsUsage() {
        AiReportJob pending = AiReportJob.builder()
            .jobId("J4").userId(7L).jobType(AiReportJobType.ADMINISTRATION).requestHash("H")
            .requestParams(Map.of("administrationCode", "A", "periodCode", "P"))
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
        AdministrationAiReportInfo report = mock(AdministrationAiReportInfo.class);
        AiUsageMeta usage = new AiUsageMeta("ollama", 60, 30);
        when(jobStore.findById("J4")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateAdministrationReport("A", "P"))
            .thenReturn(new AiGenerationResult<>(report, usage));

        worker.runAdministrationJob("J4");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.COMPLETED && j.administrationReport() == report
        ));
        verify(usageCounter).record(eq(7L), eq(usage));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void runDistrictJob_aiException_savesFailedAndReleasesIdempotency() {
        AiReportJob pending = AiReportJob.builder()
            .jobId("J3").userId(7L).jobType(AiReportJobType.DISTRICT).requestHash("H")
            .requestParams(Map.of("districtCode", "D", "periodCode", "P"))
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
        when(jobStore.findById("J3")).thenReturn(Optional.of(pending));
        when(jobStore.save(argThat(j -> j.status() == AiReportJobStatus.RUNNING)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(processor.generateDistrictReport(any(), any()))
            .thenThrow(new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE));

        worker.runDistrictJob("J3");

        verify(jobStore).save(argThat(j ->
            j.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.LLM_UNAVAILABLE.getCode().equals(j.errorCode())
        ));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
        verify(usageCounter, never()).record(any(), any());
    }

    private AiReportJob pendingJob() {
        return AiReportJob.builder()
            .jobId("J1").userId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
    }

    private Map<String, String> commercialParams() {
        return Map.of("commercialCode", "C", "serviceCode", "S", "periodCode", "P");
    }
}
