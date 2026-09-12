package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
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

    // memberId/requestHash 를 함께 받는 이유: 잡 본문을 읽지 못하는 경로(역직렬화 실패·TTL 소멸)에서는
    // 저장된 잡에서 두 값을 복원할 수 없어 멱등 키를 풀 방법이 사라진다. 그대로 두면 죽은 jobId 가
    // TTL(24h) 동안 키를 붙들어 같은 요청이 계속 404 나는 jobId 를 돌려받는 데드락이 된다.
    @Async("aiReportTaskExecutor")
    public void runJob(String jobId, Long memberId, String requestHash) {
        AiReportJob running;
        try {
            Optional<AiReportJob> jobHolder = aiReportJobStorePort.findById(jobId);
            if (jobHolder.isEmpty()) {
                log.warn("AI report job missing on worker pickup jobId={} memberId={}", jobId, memberId);
                releaseIdempotencyKeyQuietly(jobId, memberId, requestHash);
                return;
            }
            AiReportJob job = jobHolder.get();
            // 아래 두 분기는 다른 워커가 잡을 소유한 정상 경로다. 여기서 멱등 키를 풀면 소유 워커가
            // 아직 진행 중인데 중복 요청이 새 잡을 만들어버리므로 해제하지 않는다.
            if (job.status() != AiReportJobStatus.PENDING) {
                log.info("AI report job already advanced before worker pickup jobId={} status={}", jobId, job.status());
                return;
            }
            running = job.withStatus(AiReportJobStatus.RUNNING, Instant.now());
            if (!aiReportJobStorePort.saveIfStatus(running, AiReportJobStatus.PENDING)) {
                log.info("AI report job advanced concurrently before worker pickup jobId={}", jobId);
                return;
            }
            aiReportJobEventPort.publishJobUpdated(jobId);
        } catch (RuntimeException pickupFailure) {
            log.error("AI report job pickup failed jobId={} reason={}", jobId, pickupFailure.getMessage(), pickupFailure);
            return;
        }

        boolean terminalStateSaved = false;
        try {
            terminalStateSaved = aiReportJobStorePort.saveIfStatus(
                generateAndComplete(running), AiReportJobStatus.RUNNING
            );
        } catch (AiReportException domainException) {
            log.error(
                "AI report job failed jobId={} jobType={} memberId={} errorCode={} cause={}",
                running.jobId(), running.jobType(), running.memberId(),
                domainException.getErrorCode().getCode(), domainException.getMessage(), domainException
            );
            terminalStateSaved = aiReportJobStorePort.saveIfStatus(running.failed(
                domainException.getErrorCode().getCode(), domainException.getErrorCode().getMessage(), Instant.now()
            ), AiReportJobStatus.RUNNING);
        } catch (Exception unexpected) {
            log.error(
                "AI report job failed unexpectedly jobId={} jobType={} memberId={} type={} cause={}",
                running.jobId(), running.jobType(), running.memberId(),
                unexpected.getClass().getSimpleName(), unexpected.getMessage(), unexpected
            );
            terminalStateSaved = aiReportJobStorePort.saveIfStatus(running.failed(
                AiReportErrorCode.JOB_FAILED.getCode(), AiReportErrorCode.JOB_FAILED.getMessage(), Instant.now()
            ), AiReportJobStatus.RUNNING);
        } finally {
            if (terminalStateSaved) {
                aiReportJobStorePort.releaseIdempotencyKey(running.memberId(), running.requestHash(), running.jobId());
                // 종결 상태(COMPLETED/FAILED) 저장 이후에 발행해야 구독자가 재조회 시 최신 상태를 읽는다.
                aiReportJobEventPort.publishJobUpdated(running.jobId());
            }
        }
    }

    // 이미 비정상 경로(잡 유실)라서 해제 실패가 흐름을 바꾸면 안 된다. 실패는 로그만 남긴다.
    // 해제는 어댑터의 소유자 검사(RELEASE_IF_OWNER_SCRIPT)를 거치므로 다른 잡의 예약을 건드리지 않는다.
    private void releaseIdempotencyKeyQuietly(String jobId, Long memberId, String requestHash) {
        if (memberId == null || requestHash == null) {
            return;
        }
        try {
            aiReportJobStorePort.releaseIdempotencyKey(memberId, requestHash, jobId);
        } catch (RuntimeException releaseFailure) {
            log.warn("AI report idempotency release failed jobId={} memberId={} reason={}",
                jobId, memberId, releaseFailure.getMessage());
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
