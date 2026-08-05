package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
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
        Long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        Optional<CommercialAiReportInfo> cached =
            aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL, cached.get());
        }
        return submitJob(memberId, AiReportJobType.COMMERCIAL, commercialParams(commercialCode, serviceCode, periodCode));
    }

    public AiReportSubmissionInfo submitCommercialComparisonReport(Long memberId, CommercialComparisonAiQuery query) {
        Optional<CommercialComparisonAiReportInfo> cached = aiReportCachePort.getCommercialComparisonReport(
            query.leftCommercialCode(), query.rightCommercialCode(), query.serviceCode(), query.periodCode()
        );
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL_COMPARISON, cached.get());
        }
        return submitJob(memberId, AiReportJobType.COMMERCIAL_COMPARISON, commercialComparisonParams(query));
    }

    public AiReportSubmissionInfo submitDistrictReport(Long memberId, String districtCode, String periodCode) {
        Optional<DistrictAiReportInfo> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.DISTRICT, cached.get());
        }
        return submitJob(memberId, AiReportJobType.DISTRICT, districtParams(districtCode, periodCode));
    }

    public AiReportSubmissionInfo submitAdministrationReport(Long memberId, String administrationCode, String periodCode) {
        Optional<AdministrationAiReportInfo> cached =
            aiReportCachePort.getAdministrationReport(administrationCode, periodCode);
        if (cached.isPresent()) {
            return AiReportSubmissionInfo.cached(AiReportJobType.ADMINISTRATION, cached.get());
        }
        return submitJob(memberId, AiReportJobType.ADMINISTRATION, administrationParams(administrationCode, periodCode));
    }

    private AiReportSubmissionInfo submitJob(Long memberId, AiReportJobType jobType, Map<String, String> params) {
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
            log.error("AI report worker dispatch failed jobId={} memberId={} reason={}", newJobId, memberId, dispatchFailure.getMessage());
            aiReportJobStorePort.save(pendingJob.failed(
                AiReportErrorCode.JOB_FAILED.getCode(), AiReportErrorCode.JOB_FAILED.getMessage(), Instant.now()
            ));
            aiReportJobStorePort.releaseIdempotencyKey(memberId, requestHash);
        }

        return AiReportSubmissionInfo.accepted(jobType, newJobId);
    }

    public AiReportJobInfo getJobInfo(String jobId, Long memberId) {
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
        return expired;
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
