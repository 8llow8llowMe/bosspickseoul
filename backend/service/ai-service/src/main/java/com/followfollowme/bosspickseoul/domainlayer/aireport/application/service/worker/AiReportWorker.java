package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobParamKeys;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
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
            // errorCode enum 의 원본 메시지가 아니라 예외 메시지를 저장한다. AI_010 처럼 메시지에 %s 자리표시자가
            // 있는 코드는 예외를 만들 때 이미 치환되므로, enum 원본을 쓰면 사용자가 "(%s)" 를 그대로 받는다.
            // 자리표시자가 없는 코드는 AiReportException 이 생성자에서 super(errorCode.getMessage()) 를 호출하므로
            // 두 값이 같다 — 다른 에러코드의 저장 동작은 바뀌지 않는다.
            terminalStateSaved = aiReportJobStorePort.saveIfStatus(running.failed(
                domainException.getErrorCode().getCode(), domainException.getMessage(), Instant.now()
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
                AiGenerationResult<CommercialAiReportSnapshot> result = aiReportProcessor.generateCommercialReport(
                    params.get(AiReportJobParamKeys.COMMERCIAL_CODE), params.get(AiReportJobParamKeys.SERVICE_CODE), params.get(AiReportJobParamKeys.PERIOD_CODE)
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithCommercialReport(result.draft(), Instant.now());
            }
            case COMMERCIAL_COMPARISON -> {
                AiGenerationResult<CommercialComparisonAiReportSnapshot> result = aiReportProcessor.generateCommercialComparisonReport(
                    new CommercialComparisonAiQuery(
                        params.get(AiReportJobParamKeys.LEFT_COMMERCIAL_CODE), params.get(AiReportJobParamKeys.RIGHT_COMMERCIAL_CODE),
                        params.get(AiReportJobParamKeys.SERVICE_CODE), params.get(AiReportJobParamKeys.PERIOD_CODE)
                    )
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithCommercialComparisonReport(result.draft(), Instant.now());
            }
            case DISTRICT -> {
                AiGenerationResult<DistrictAiReportSnapshot> result = aiReportProcessor.generateDistrictReport(
                    params.get(AiReportJobParamKeys.DISTRICT_CODE), params.get(AiReportJobParamKeys.PERIOD_CODE)
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithDistrictReport(result.draft(), Instant.now());
            }
            case ADMINISTRATION -> {
                AiGenerationResult<AdministrationAiReportSnapshot> result = aiReportProcessor.generateAdministrationReport(
                    params.get(AiReportJobParamKeys.ADMINISTRATION_CODE), params.get(AiReportJobParamKeys.PERIOD_CODE)
                );
                aiUsageCounterPort.record(running.memberId(), result.usage());
                yield running.completedWithAdministrationReport(result.draft(), Instant.now());
            }
        };
    }
}
