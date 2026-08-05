package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.worker;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportWorker {

    private final AiReportJobStorePort aiReportJobStorePort;
    private final AiReportJobEventPort aiReportJobEventPort;
    private final AiReportProcessor aiReportProcessor;
    private final AiUsageCounterPort aiUsageCounterPort;

    @Async("aiReportTaskExecutor")
    public void runJob(String jobId) {
        AiReportJob running;
        try {
            Optional<AiReportJob> jobHolder = aiReportJobStorePort.findById(jobId);
            if (jobHolder.isEmpty()) {
                log.warn("AI report job missing on worker pickup jobId={}", jobId);
                return;
            }
            AiReportJob job = jobHolder.get();
            if (job.status() != AiReportJobStatus.PENDING) {
                log.info("AI report job already advanced before worker pickup jobId={} status={}", jobId, job.status());
                return;
            }
            running = aiReportJobStorePort.save(job.withStatus(AiReportJobStatus.RUNNING, Instant.now()));
            aiReportJobEventPort.publishJobUpdated(jobId);
        } catch (RuntimeException pickupFailure) {
            log.error("AI report job pickup failed jobId={} reason={}", jobId, pickupFailure.getMessage(), pickupFailure);
            return;
        }

        try {
            aiReportJobStorePort.save(generateAndComplete(running));
        } catch (AiReportException domainException) {
            log.error(
                "AI report job failed jobId={} jobType={} memberId={} errorCode={} cause={}",
                running.jobId(), running.jobType(), running.memberId(),
                domainException.getErrorCode().getCode(), domainException.getMessage(), domainException
            );
            aiReportJobStorePort.save(running.failed(
                domainException.getErrorCode().getCode(), domainException.getErrorCode().getMessage(), Instant.now()
            ));
        } catch (Exception unexpected) {
            log.error(
                "AI report job failed unexpectedly jobId={} jobType={} memberId={} type={} cause={}",
                running.jobId(), running.jobType(), running.memberId(),
                unexpected.getClass().getSimpleName(), unexpected.getMessage(), unexpected
            );
            aiReportJobStorePort.save(running.failed(
                AiReportErrorCode.JOB_FAILED.getCode(), AiReportErrorCode.JOB_FAILED.getMessage(), Instant.now()
            ));
        } finally {
            aiReportJobStorePort.releaseIdempotencyKey(running.memberId(), running.requestHash());
            // 종결 상태(COMPLETED/FAILED) 저장 이후에 발행해야 구독자가 재조회 시 최신 상태를 읽는다.
            aiReportJobEventPort.publishJobUpdated(running.jobId());
        }
    }

    private AiReportJob generateAndComplete(AiReportJob running) {
        Map<String, String> params = running.requestParams();
        return switch (running.jobType()) {
            case COMMERCIAL -> {
                AiGenerationResult<CommercialAiReportInfo> result = aiReportProcessor.generateCommercialReport(
                    params.get("commercialCode"), params.get("serviceCode"), params.get("periodCode")
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithCommercialReport(result.draft(), Instant.now());
            }
            case COMMERCIAL_COMPARISON -> {
                AiGenerationResult<CommercialComparisonAiReportInfo> result = aiReportProcessor.generateCommercialComparisonReport(
                    new CommercialComparisonAiQuery(
                        params.get("leftCommercialCode"), params.get("rightCommercialCode"),
                        params.get("serviceCode"), params.get("periodCode")
                    )
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithCommercialComparisonReport(result.draft(), Instant.now());
            }
            case DISTRICT -> {
                AiGenerationResult<DistrictAiReportInfo> result = aiReportProcessor.generateDistrictReport(
                    params.get("districtCode"), params.get("periodCode")
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithDistrictReport(result.draft(), Instant.now());
            }
            case ADMINISTRATION -> {
                AiGenerationResult<AdministrationAiReportInfo> result = aiReportProcessor.generateAdministrationReport(
                    params.get("administrationCode"), params.get("periodCode")
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithAdministrationReport(result.draft(), Instant.now());
            }
        };
    }
}
