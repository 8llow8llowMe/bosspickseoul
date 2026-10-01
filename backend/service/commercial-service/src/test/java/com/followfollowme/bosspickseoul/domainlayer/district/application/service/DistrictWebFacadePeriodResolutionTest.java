package com.followfollowme.bosspickseoul.domainlayer.district.application.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.bosspickseoul.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 자치구 유스케이스가 생략된 현재 분기를 적재 기준 기본 분기로 해석해 Processor 에 넘기는지 확인한다(이슈 #464).
 * 비교 분기는 넘긴 그대로(null) 두고, Processor 가 해석된 현재 분기 기준으로 직전 분기를 정한다
 * ({@code DistrictQueryProcessorPeriodTest}).
 */
@ExtendWith(MockitoExtension.class)
class DistrictWebFacadePeriodResolutionTest {

    @Mock
    private DistrictQueryProcessor districtQueryProcessor;

    @Mock
    private DistrictPresenter districtPresenter;

    @Mock
    private AnalysisViewPublishProcessor analysisViewPublishProcessor;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Test
    @DisplayName("자치구 Top10 은 해석된 현재 분기와 생략된 비교 분기로 Processor 를 부른다")
    void districtTopTenResolvesTheCurrentPeriod() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn("20261");

        new DistrictWebFacade(districtQueryProcessor, districtPresenter, analysisViewPublishProcessor, analysisPeriodCatalogProcessor)
            .getTopTenDistricts(null, null);

        verify(districtQueryProcessor).getTopTenSummary("20261", null);
    }

    @Test
    @DisplayName("명시한 현재 분기는 그대로 넘긴다")
    void explicitCurrentPeriodPassesThrough() {
        when(analysisPeriodCatalogProcessor.resolve("20233")).thenReturn("20233");

        new DistrictWebFacade(districtQueryProcessor, districtPresenter, analysisViewPublishProcessor, analysisPeriodCatalogProcessor)
            .getDistrictChangeDetail("11110", "20233");

        verify(districtQueryProcessor).getDistrictChangeDetail("11110", "20233");
    }
}
