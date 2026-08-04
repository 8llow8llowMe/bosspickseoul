package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.worker;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiGenerationResult;
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
    private final AiReportProcessor aiReportProcessor;
    private final AiUsageCounterPort aiUsageCounterPort;

    @Async("aiReportTaskExecutor")
    public void runCommercialJob(String jobId) {
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
        } catch (RuntimeException pickupFailure) {
            log.error("AI report job pickup failed jobId={} reason={}", jobId, pickupFailure.getMessage(), pickupFailure);
            return;
        }

        Map<String, String> params = running.requestParams();
        try {
            AiGenerationResult<CommercialAiReportInfo> result = aiReportProcessor.generateCommercialReport(
                params.get("commercialCode"), params.get("serviceCode"), params.get("periodCode")
            );
            aiUsageCounterPort.record(running.memberId(), result.usage());
            aiReportJobStorePort.save(running.completedWithCommercialReport(result.draft(), Instant.now()));
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
        }
    }
}
