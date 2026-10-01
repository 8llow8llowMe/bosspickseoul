package com.followfollowme.bosspickseoul.domainlayer.administration.application.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.presenter.AdministrationPresenter;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.service.processor.AdministrationQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 행정동 상세가 생략된 현재 분기를 적재 기준 기본 분기로 해석해 Processor 에 넘기는지 확인한다(이슈 #464). */
@ExtendWith(MockitoExtension.class)
class AdministrationWebFacadePeriodResolutionTest {

    @Mock
    private AdministrationQueryProcessor administrationQueryProcessor;

    @Mock
    private AdministrationPresenter administrationPresenter;

    @Mock
    private AnalysisViewPublishProcessor analysisViewPublishProcessor;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Test
    @DisplayName("행정동 상세는 해석된 현재 분기로 Processor 를 부른다")
    void administrationDetailResolvesTheCurrentPeriod() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn("20261");
        when(administrationQueryProcessor.getAdministrationDetail("11110515", "20261", null))
            .thenReturn(AdministrationDetailInfo.builder().administrationCode("11110515").administrationName("청운효자동").build());

        new AdministrationWebFacade(administrationQueryProcessor, administrationPresenter, analysisViewPublishProcessor, analysisPeriodCatalogProcessor)
            .getAdministrationDetail("11110515", null, null);

        verify(administrationQueryProcessor).getAdministrationDetail("11110515", "20261", null);
    }
}
