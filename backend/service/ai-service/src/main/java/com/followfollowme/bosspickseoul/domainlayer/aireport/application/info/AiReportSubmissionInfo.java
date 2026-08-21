package com.followfollowme.bosspickseoul.domainlayer.aireport.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Builder
public record AiReportSubmissionInfo(
    AiReportSubmissionStatus submissionStatus,
    AiReportJobType jobType,
    String jobId,
    CommercialAiReportInfo commercialReport,
    CommercialComparisonAiReportInfo commercialComparisonReport,
    DistrictAiReportInfo districtReport,
    AdministrationAiReportInfo administrationReport
) {

    @Getter
    @RequiredArgsConstructor
    public enum AiReportSubmissionStatus implements CodeNameDescribable {
        CACHED("캐시 결과 반환", "이미 생성된 리포트를 즉시 반환했습니다."),
        ACCEPTED("작업 접수됨", "리포트 생성 작업이 접수되었습니다. 작업 상태 조회 API로 완료 여부를 확인해 주세요.");

        private final String displayName;
        private final String description;
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, CommercialAiReportInfo commercialReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .commercialReport(commercialReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, CommercialComparisonAiReportInfo commercialComparisonReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .commercialComparisonReport(commercialComparisonReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, DistrictAiReportInfo districtReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .districtReport(districtReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, AdministrationAiReportInfo administrationReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .administrationReport(administrationReport)
            .build();
    }

    public static AiReportSubmissionInfo accepted(AiReportJobType jobType, String jobId) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED)
            .jobType(jobType)
            .jobId(jobId)
            .build();
    }
}
