package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;

public interface AiReportWebUseCase {

    AiReportSubmissionResponse submitCommercialReport(long memberId, String commercialCode, String serviceCode, String periodCode);

    AiReportSubmissionResponse submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query);

    AiReportSubmissionResponse submitDistrictReport(long memberId, String districtCode, String periodCode);

    AiReportSubmissionResponse submitAdministrationReport(long memberId, String administrationCode, String periodCode);

    /**
     * 잡의 진행 상태와 완료 결과를 조회해 응답 DTO 로 돌려준다. 본인이 제출한 작업만 조회할 수 있다.
     * SSE 스트리밍은 종결 판정을 위해 도메인 술어가 필요하므로 {@link AiReportJobStreamUseCase} 를 쓴다.
     */
    AiReportJobStatusResponse getJobStatusResponse(String jobId, long memberId);
}
