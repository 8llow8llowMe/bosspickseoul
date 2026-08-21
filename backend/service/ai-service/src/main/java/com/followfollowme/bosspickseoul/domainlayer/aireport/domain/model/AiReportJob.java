package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.DistrictAiReportInfo;
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
    CommercialAiReportInfo commercialReport,
    CommercialComparisonAiReportInfo commercialComparisonReport,
    DistrictAiReportInfo districtReport,
    AdministrationAiReportInfo administrationReport
) {

    public AiReportJob withStatus(AiReportJobStatus next, Instant now) {
        return toBuilder()
            .status(next)
            .startedAt(next == AiReportJobStatus.RUNNING ? now : startedAt)
            .completedAt(next.isTerminal() ? now : completedAt)
            .build();
    }

    public AiReportJob completedWithCommercialReport(CommercialAiReportInfo report, Instant now) {
        return completed(now).commercialReport(report).build();
    }

    public AiReportJob completedWithCommercialComparisonReport(CommercialComparisonAiReportInfo report, Instant now) {
        return completed(now).commercialComparisonReport(report).build();
    }

    public AiReportJob completedWithDistrictReport(DistrictAiReportInfo report, Instant now) {
        return completed(now).districtReport(report).build();
    }

    public AiReportJob completedWithAdministrationReport(AdministrationAiReportInfo report, Instant now) {
        return completed(now).administrationReport(report).build();
    }

    public AiReportJob failed(String errorCode, String errorMessage, Instant now) {
        return toBuilder()
            .status(AiReportJobStatus.FAILED)
            .errorCode(errorCode)
            .errorMessage(errorMessage)
            .completedAt(now)
            .build();
    }

    private AiReportJobBuilder completed(Instant now) {
        return toBuilder()
            .status(AiReportJobStatus.COMPLETED)
            .errorCode(null)
            .errorMessage(null)
            .completedAt(now);
    }

    // 상태 전이 시 전체 필드를 수동 재빌드하다 새 필드를 누락하는 실수를 막기 위해
    // 현재 값을 모두 복사한 빌더에서 시작한다.
    private AiReportJobBuilder toBuilder() {
        return AiReportJob.builder()
            .jobId(jobId)
            .memberId(memberId)
            .jobType(jobType)
            .requestHash(requestHash)
            .requestParams(requestParams)
            .status(status)
            .errorCode(errorCode)
            .errorMessage(errorMessage)
            .createdAt(createdAt)
            .startedAt(startedAt)
            .completedAt(completedAt)
            .commercialReport(commercialReport)
            .commercialComparisonReport(commercialComparisonReport)
            .districtReport(districtReport)
            .administrationReport(administrationReport);
    }
}
