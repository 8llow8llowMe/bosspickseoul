package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * AI 리포트 유스케이스 오케스트레이터.
 *
 * <p><b>{@code @Transactional(readOnly = true)} 를 붙이지 않는다.</b> architecture-guide §3 의
 * "읽기는 readOnly 를 기본으로 검토한다" 는 DB 트랜잭션이 있는 서비스 전제다. ai-service 에는
 * JPA/DataSource 의존이 없고 {@code PlatformTransactionManager} 도 {@code @EnableTransactionManagement} 도
 * 선언되어 있지 않아 트랜잭션 프록시 자체가 만들어지지 않는다. 붙여 두면 "트랜잭션 경계가 있다"는
 * 잘못된 신호만 남는다. 이 파사드가 실제로 쓰는 저장소는 Redis(잡/캐시/카운터)와 원격 HTTP 뿐이고
 * 원자성은 각 어댑터의 Lua 스크립트·조건부 저장(saveIfStatus)이 담당한다.
 * 나중에 ai-service 에 DB 가 들어오면 그때 이 결정을 다시 본다.
 */
@Service
@RequiredArgsConstructor
public class AiReportWebFacade implements AiReportWebUseCase {

    private final AiReportJobProcessor aiReportJobProcessor;
    private final AiReportPresenter aiReportPresenter;

    @Override
    public AiReportSubmissionResponse submitCommercialReport(
        long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        return aiReportPresenter.toSubmissionResponse(
            aiReportJobProcessor.submitCommercialReport(memberId, commercialCode, serviceCode, periodCode)
        );
    }

    @Override
    public AiReportSubmissionResponse submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query) {
        return aiReportPresenter.toSubmissionResponse(aiReportJobProcessor.submitCommercialComparisonReport(memberId, query));
    }

    @Override
    public AiReportSubmissionResponse submitDistrictReport(long memberId, String districtCode, String periodCode) {
        return aiReportPresenter.toSubmissionResponse(aiReportJobProcessor.submitDistrictReport(memberId, districtCode, periodCode));
    }

    @Override
    public AiReportSubmissionResponse submitAdministrationReport(long memberId, String administrationCode, String periodCode) {
        return aiReportPresenter.toSubmissionResponse(
            aiReportJobProcessor.submitAdministrationReport(memberId, administrationCode, periodCode)
        );
    }

    @Override
    public AiReportJobStatusResponse getJobStatusResponse(String jobId, long memberId) {
        return aiReportPresenter.toJobStatusResponse(aiReportJobProcessor.getJobInfo(jobId, memberId));
    }
}
