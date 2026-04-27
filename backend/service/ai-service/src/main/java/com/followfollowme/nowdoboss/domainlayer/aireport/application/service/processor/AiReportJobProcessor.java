package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportJobProcessor {

    private final AiReportJobStorePort aiReportJobStorePort;
    private final AiReportCachePort aiReportCachePort;
    private final AiReportWorker aiReportWorker;
    private final AiReportJobProperties aiReportJobProperties;

    public AiReportSubmissionInfo submitCommercialReport(
        Long userId, String commercialCode, String serviceCode, String periodCode
    ) {
        Optional<CommercialAiReportInfo> cached =
            aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL, cached.get());
        }

        Map<String, String> params = commercialParams(commercialCode, serviceCode, periodCode);
        String requestHash = computeRequestHash(AiReportJobType.COMMERCIAL, params);
        String newJobId = UUID.randomUUID().toString();

        AiReportJob pendingJob = AiReportJob.builder()
            .jobId(newJobId)
            .userId(userId)
            .jobType(AiReportJobType.COMMERCIAL)
            .requestHash(requestHash)
            .requestParams(params)
            .status(AiReportJobStatus.PENDING)
            .createdAt(Instant.now())
            .build();

        // Save first so a published idempotency key always points at an existing job.
        aiReportJobStorePort.save(pendingJob);

        Optional<String> existingJobId = aiReportJobStorePort.reserveOrGetExistingJobId(userId, requestHash, newJobId);
        if (existingJobId.isPresent()) {
            // Another request won the reservation race, so remove this unused job entry.
            aiReportJobStorePort.deleteJob(newJobId);
            return AiReportSubmissionInfo.accepted(AiReportJobType.COMMERCIAL, existingJobId.get());
        }

        try {
            aiReportWorker.runCommercialJob(newJobId);
        } catch (RuntimeException dispatchFailure) {
            log.error("AI report worker dispatch failed jobId={} userId={} reason={}", newJobId, userId, dispatchFailure.getMessage());
            aiReportJobStorePort.save(pendingJob.failed(
                AiReportErrorCode.JOB_FAILED.getCode(), AiReportErrorCode.JOB_FAILED.getMessage(), Instant.now()
            ));
            aiReportJobStorePort.releaseIdempotencyKey(userId, requestHash);
        }

        return AiReportSubmissionInfo.accepted(AiReportJobType.COMMERCIAL, newJobId);
    }

    public AiReportJobInfo getJobInfo(String jobId, Long userId) {
        AiReportJob job = aiReportJobStorePort.findById(jobId)
            .orElseThrow(() -> new AiReportException(AiReportErrorCode.JOB_NOT_FOUND));
        if (job.userId() == null || !job.userId().equals(userId)) {
            throw new AiReportException(AiReportErrorCode.JOB_NOT_FOUND);
        }

        AiReportJob effectiveJob = expireIfStuck(job);

        // Prefer the job snapshot; cache fallback keeps older completed jobs readable.
        CommercialAiReportInfo commercialReport = null;
        if (effectiveJob.status() == AiReportJobStatus.COMPLETED && effectiveJob.jobType() == AiReportJobType.COMMERCIAL) {
            commercialReport = effectiveJob.commercialReport();
            if (commercialReport == null) {
                Map<String, String> params = effectiveJob.requestParams();
                commercialReport = aiReportCachePort.getCommercialReport(
                    params.get("commercialCode"), params.get("serviceCode"), params.get("periodCode")
                ).orElse(null);
            }
        }

        return AiReportJobInfo.builder()
            .jobId(effectiveJob.jobId())
            .jobType(effectiveJob.jobType())
            .status(effectiveJob.status())
            .commercialReport(commercialReport)
            .errorCode(effectiveJob.errorCode())
            .errorMessage(effectiveJob.errorMessage())
            .build();
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
        aiReportJobStorePort.releaseIdempotencyKey(job.userId(), job.requestHash());
        return expired;
    }

    private Map<String, String> commercialParams(String commercialCode, String serviceCode, String periodCode) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("commercialCode", commercialCode);
        params.put("serviceCode", serviceCode);
        params.put("periodCode", periodCode);
        return params;
    }

    private String computeRequestHash(AiReportJobType jobType, Map<String, String> params) {
        StringBuilder builder = new StringBuilder(jobType.name());
        params.forEach((k, v) -> builder.append('|').append(k).append('=').append(v));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(builder.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }
}
