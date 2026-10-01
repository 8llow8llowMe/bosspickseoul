package com.followfollowme.bosspickseoul.domainlayer.administration.application.service;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.presenter.AdministrationPresenter;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.in.AdministrationWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.service.processor.AdministrationQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdministrationWebFacade implements AdministrationWebUseCase {

    private final AdministrationQueryProcessor administrationQueryProcessor;
    private final AdministrationPresenter administrationPresenter;
    private final AnalysisViewPublishProcessor analysisViewPublishProcessor;
    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Override
    @Transactional(readOnly = true)
    public AdministrationDetailResponse getAdministrationDetail(
        String administrationCode, String currentPeriodCode, String previousPeriodCode
    ) {
        // 생략된 현재 분기는 적재 기준 기본 분기로 해석한다(이슈 #464). 비교 분기는 Processor 가 해석된 현재 분기 기준으로 정한다.
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        AdministrationDetailInfo info = administrationQueryProcessor.getAdministrationDetail(
            administrationCode, currentPeriodCode, previousPeriodCode);
        // 인기 순위 집계용 이벤트. 포트 계약상 절대 예외를 던지지 않아 본 조회 응답에는 영향이 없다.
        analysisViewPublishProcessor.publishView(
            AnalysisAreaType.ADMINISTRATION, administrationCode, info.administrationName());
        return administrationPresenter.toAdministrationDetailResponse(info);
    }
}
