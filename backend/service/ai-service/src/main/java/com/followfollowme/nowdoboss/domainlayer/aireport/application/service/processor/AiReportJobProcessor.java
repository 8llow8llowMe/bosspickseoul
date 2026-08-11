package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.worker.AiReportWorker;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.nowdoboss.global.properties.AiReportJobProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.RejectedExecutionException;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportJobProcessor {

    private final AiReportJobStorePort aiReportJobStorePort;
    private final AiReportCachePort aiReportCachePort;
    private final AiReportJobEventPort aiReportJobEventPort;
    private final AiReportWorker aiReportWorker;
    private final AiReportJobProperties aiReportJobProperties;

    public AiReportSubmissionInfo submitCommercialReport(
        long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        Optional<CommercialAiReportInfo> cached =
            aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL, cached.get());
        }
        return submitJob(memberId, AiReportJobType.COMMERCIAL, commercialParams(commercialCode, serviceCode, periodCode));
    }

    public AiReportSubmissionInfo submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query) {
        Optional<CommercialComparisonAiReportInfo> cached = aiReportCachePort.getCommercialComparisonReport(
            query.leftCommercialCode(), query.rightCommercialCode(), query.serviceCode(), query.periodCode()
        );
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL_COMPARISON, cached.get());
        }
        return submitJob(memberId, AiReportJobType.COMMERCIAL_COMPARISON, commercialComparisonParams(query));
    }

    public AiReportSubmissionInfo submitDistrictReport(long memberId, String districtCode, String periodCode) {
        Optional<DistrictAiReportInfo> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.DISTRICT, cached.get());
        }
        return submitJob(memberId, AiReportJobType.DISTRICT, districtParams(districtCode, periodCode));
    }

    public AiReportSubmissionInfo submitAdministrationReport(long memberId, String administrationCode, String periodCode) {
        Optional<AdministrationAiReportInfo> cached =
            aiReportCachePort.getAdministrationReport(administrationCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.ADMINISTRATION, cached.get());
        }
        return submitJob(memberId, AiReportJobType.ADMINISTRATION, administrationParams(administrationCode, periodCode));
    }

    private AiReportSubmissionInfo submitJob(long memberId, AiReportJobType jobType, Map<String, String> params) {
        String requestHash = computeRequestHash(jobType, params);
        String newJobId = UUID.randomUUID().toString();

        AiReportJob pendingJob = AiReportJob.builder()
            .jobId(newJobId)
            .memberId(memberId)
            .jobType(jobType)
            .requestHash(requestHash)
            .requestParams(params)
            .status(AiReportJobStatus.PENDING)
            .createdAt(Instant.now())
            .build();

        // Save first so a published idempotency key always points at an existing job.
        aiReportJobStorePort.save(pendingJob);

        Optional<String> existingJobId = aiReportJobStorePort.reserveOrGetExistingJobId(memberId, requestHash, newJobId);
        if (existingJobId.isPresent()) {
            // Another request won the reservation race, so remove this unused job entry.
            aiReportJobStorePort.deleteJob(newJobId);
            return AiReportSubmissionInfo.accepted(jobType, existingJobId.get());
        }

        try {
            aiReportWorker.runJob(newJobId);
        } catch (RuntimeException dispatchFailure) {
            // 대기열 포화(TaskRejectedException)는 "작업 실패"가 아니라 "지금은 받을 수 없음"이다.
            // 재시도하면 성공할 수 있는 상황이라 사용자 안내가 달라지도록 코드를 구분한다.
            AiReportErrorCode errorCode = isQueueFull(dispatchFailure)
                ? AiReportErrorCode.JOB_QUEUE_FULL
                : AiReportErrorCode.JOB_FAILED;
            log.error("AI report worker dispatch failed jobId={} memberId={} errorCode={} reason={}",
                newJobId, memberId, errorCode.getCode(), dispatchFailure.getMessage());
            aiReportJobStorePort.save(pendingJob.failed(
                errorCode.getCode(), errorCode.getMessage(), Instant.now()
            ));
            aiReportJobStorePort.releaseIdempotencyKey(memberId, requestHash);
            aiReportJobEventPort.publishJobUpdated(newJobId);
        }

        return AiReportSubmissionInfo.accepted(jobType, newJobId);
    }

    public AiReportJobInfo getJobInfo(String jobId, long memberId) {
        AiReportJob job = aiReportJobStorePort.findById(jobId)
            .orElseThrow(() -> new AiReportException(AiReportErrorCode.JOB_NOT_FOUND));
        if (job.memberId() == null || !job.memberId().equals(memberId)) {
            throw new AiReportException(AiReportErrorCode.JOB_NOT_FOUND);
        }

        AiReportJob effectiveJob = expireIfStuck(job);

        AiReportJobInfo.AiReportJobInfoBuilder builder = AiReportJobInfo.builder()
            .jobId(effectiveJob.jobId())
            .jobType(effectiveJob.jobType())
            .status(effectiveJob.status())
            .errorCode(effectiveJob.errorCode())
            .errorMessage(effectiveJob.errorMessage());

        // Prefer the job snapshot; cache fallback keeps older completed jobs readable.
        if (effectiveJob.status() == AiReportJobStatus.COMPLETED) {
            Map<String, String> params = effectiveJob.requestParams();
            switch (effectiveJob.jobType()) {
                case COMMERCIAL -> builder.commercialReport(
                    effectiveJob.commercialReport() != null
                        ? effectiveJob.commercialReport()
                        : aiReportCachePort.getCommercialReport(
                            params.get("commercialCode"), params.get("serviceCode"), params.get("periodCode")
                        ).orElse(null)
                );
                case COMMERCIAL_COMPARISON -> builder.commercialComparisonReport(
                    effectiveJob.commercialComparisonReport() != null
                        ? effectiveJob.commercialComparisonReport()
                        : aiReportCachePort.getCommercialComparisonReport(
                            params.get("leftCommercialCode"), params.get("rightCommercialCode"),
                            params.get("serviceCode"), params.get("periodCode")
                        ).orElse(null)
                );
                case DISTRICT -> builder.districtReport(
                    effectiveJob.districtReport() != null
                        ? effectiveJob.districtReport()
                        : aiReportCachePort.getDistrictReport(
                            params.get("districtCode"), params.get("periodCode")
                        ).orElse(null)
                );
                case ADMINISTRATION -> builder.administrationReport(
                    effectiveJob.administrationReport() != null
                        ? effectiveJob.administrationReport()
                        : aiReportCachePort.getAdministrationReport(
                            params.get("administrationCode"), params.get("periodCode")
                        ).orElse(null)
                );
            }
        }

        return builder.build();
    }

    private AiReportJob expireIfStuck(AiReportJob job) {
        Instant now = Instant.now();
        Duration pendingLimit = Duration.ofSeconds(aiReportJobProperties.pendingTimeoutSeconds());
        Duration runningLimit = Duration.ofSeconds(aiReportJobProperties.runningTimeoutSeconds());

        boolean pendingExpired = job.status() == AiReportJobStatus.PENDING
            && job.createdAt() != null
            && Duration.between(job.createdAt(), now).compareTo(pendingLimit) > 0;
        boolean runningExpired = job.status() == AiReportJobStatus.RUNNING
            && job.startedAt() != null
            && Duration.between(job.startedAt(), now).compareTo(runningLimit) > 0;

        if (!pendingExpired && !runningExpired) {
            return job;
        }

        log.warn("AI report job timed out jobId={} status={} createdAt={} startedAt={}",
            job.jobId(), job.status(), job.createdAt(), job.startedAt());
        AiReportJob expired = job.failed(
            AiReportErrorCode.JOB_TIMEOUT.getCode(), AiReportErrorCode.JOB_TIMEOUT.getMessage(), now
        );
        aiReportJobStorePort.save(expired);
        aiReportJobStorePort.releaseIdempotencyKey(job.memberId(), job.requestHash());
        aiReportJobEventPort.publishJobUpdated(job.jobId());
        return expired;
    }

    /**
     * 잡 상태 변경 구독. 이벤트 수신 시마다 저장소에서 최신 상태를 다시 읽어 전달하므로
     * pub/sub 메시지 자체에는 상태를 싣지 않는다(발행-저장 순서 역전, 스키마 드리프트 방지).
     */
    public AiReportJobSubscription subscribeJobUpdates(String jobId, long memberId, Consumer<AiReportJobInfo> onUpdate) {
        return aiReportJobEventPort.subscribe(jobId, () -> {
            try {
                onUpdate.accept(getJobInfo(jobId, memberId));
            } catch (RuntimeException exception) {
                // 구독 콜백은 pub/sub 리스너 스레드에서 실행되므로 예외를 전파하지 않는다.
                log.warn("AI 리포트 잡 이벤트 처리에 실패했습니다. jobId={} reason={}", jobId, exception.getMessage());
            }
        });
    }

    private Map<String, String> commercialParams(String commercialCode, String serviceCode, String periodCode) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("commercialCode", commercialCode);
        params.put("serviceCode", serviceCode);
        params.put("periodCode", periodCode);
        return params;
    }

    private Map<String, String> commercialComparisonParams(CommercialComparisonAiQuery query) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("leftCommercialCode", query.leftCommercialCode());
        params.put("rightCommercialCode", query.rightCommercialCode());
        params.put("serviceCode", query.serviceCode());
        params.put("periodCode", query.periodCode());
        return params;
    }

    private Map<String, String> districtParams(String districtCode, String periodCode) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("districtCode", districtCode);
        params.put("periodCode", periodCode);
        return params;
    }

    private Map<String, String> administrationParams(String administrationCode, String periodCode) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("administrationCode", administrationCode);
        params.put("periodCode", periodCode);
        return params;
    }

    private boolean isQueueFull(RuntimeException dispatchFailure) {
        return dispatchFailure instanceof TaskRejectedException
            || dispatchFailure.getCause() instanceof RejectedExecutionException;
    }

    private String computeRequestHash(AiReportJobType jobType, Map<String, String> params) {
        StringBuilder builder = new StringBuilder(jobType.name());
        params.forEach((k, v) -> builder.append('|').append(k).append('=').append(v));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(builder.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (NoSuchAlgorithmException exception) {
            throw new AiReportException(AiReportErrorCode.IDEMPOTENCY_KEY_GENERATION_FAILED, exception);
        }
    }
}
