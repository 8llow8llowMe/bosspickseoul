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
    // 제출에 실제로 쓴 분기. 요청이 분기를 생략하면 적재 기준 기본 분기다(이슈 #464).
    String periodCode,
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

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, String periodCode, CommercialAiReportInfo commercialReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .periodCode(periodCode)
            .commercialReport(commercialReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, String periodCode, CommercialComparisonAiReportInfo commercialComparisonReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .periodCode(periodCode)
            .commercialComparisonReport(commercialComparisonReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, String periodCode, DistrictAiReportInfo districtReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .periodCode(periodCode)
            .districtReport(districtReport)
            .build();
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, String periodCode, AdministrationAiReportInfo administrationReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .periodCode(periodCode)
            .administrationReport(administrationReport)
            .build();
    }

    public static AiReportSubmissionInfo accepted(AiReportJobType jobType, String periodCode, String jobId) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED)
            .jobType(jobType)
            .periodCode(periodCode)
            .jobId(jobId)
            .build();
    }
}
