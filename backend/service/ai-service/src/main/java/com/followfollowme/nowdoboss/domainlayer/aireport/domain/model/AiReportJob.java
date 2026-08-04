package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import java.time.Instant;
import java.util.Map;
import lombok.Builder;

@Builder
public record AiReportJob(
    String jobId,
    Long memberId,
    AiReportJobType jobType,
    String requestHash,
    Map<String, String> requestParams,
    AiReportJobStatus status,
    String errorCode,
    String errorMessage,
    Instant createdAt,
    Instant startedAt,
    Instant completedAt,
    CommercialAiReportInfo commercialReport
) {

    public AiReportJob withStatus(AiReportJobStatus next, Instant now) {
        return AiReportJob.builder()
            .jobId(jobId).memberId(memberId).jobType(jobType).requestHash(requestHash).requestParams(requestParams)
            .status(next)
            .errorCode(errorCode).errorMessage(errorMessage)
            .createdAt(createdAt)
            .startedAt(next == AiReportJobStatus.RUNNING ? now : startedAt)
            .completedAt(next.isTerminal() ? now : completedAt)
            .commercialReport(commercialReport)
            .build();
    }

    public AiReportJob completedWithCommercialReport(CommercialAiReportInfo report, Instant now) {
        return AiReportJob.builder()
            .jobId(jobId).memberId(memberId).jobType(jobType).requestHash(requestHash).requestParams(requestParams)
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(createdAt).startedAt(startedAt).completedAt(now)
            .commercialReport(report)
            .build();
    }

    public AiReportJob failed(String errorCode, String errorMessage, Instant now) {
        return AiReportJob.builder()
            .jobId(jobId).memberId(memberId).jobType(jobType).requestHash(requestHash).requestParams(requestParams)
            .status(AiReportJobStatus.FAILED)
            .errorCode(errorCode).errorMessage(errorMessage)
            .createdAt(createdAt).startedAt(startedAt).completedAt(now)
            .commercialReport(commercialReport)
            .build();
    }
}
