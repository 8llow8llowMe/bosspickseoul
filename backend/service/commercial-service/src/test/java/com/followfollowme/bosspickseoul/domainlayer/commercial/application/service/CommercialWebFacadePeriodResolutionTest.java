package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialComparisonQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialTrendQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 상권 분석 유스케이스가 생략된 분기를 Processor 에 넘기기 전에 적재 기준 기본 분기로 해석하는지 확인한다(이슈 #464).
 *
 * <p>해석 지점이 하나({@link AnalysisPeriodCatalogProcessor#resolve(String)})라야 화면마다 기본 분기가 갈리지 않는다.
 * 예전처럼 상수로 채우면 적재되지 않은 분기가 기본이 돼 화면 전체가 404 다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialWebFacadePeriodResolutionTest {

    @Mock
    private CommercialQueryProcessor commercialQueryProcessor;

    @Mock
    private CommercialComparisonQueryProcessor commercialComparisonQueryProcessor;

    @Mock
    private CommercialTrendQueryProcessor commercialTrendQueryProcessor;

    @Mock
    private CommercialPresenter commercialPresenter;

    @Mock
    private AnalysisViewPublishProcessor analysisViewPublishProcessor;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @InjectMocks
    private CommercialWebFacade commercialWebFacade;

    @Test
    @DisplayName("분기를 생략한 조회는 해석된 기본 분기로 Processor 를 부른다")
    void omittedPeriodIsResolvedBeforeTheProcessorRuns() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn("20261");
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode("20261", "3110008"))
            .thenReturn(CommercialFootTrafficInfo.builder().periodCode("20261").commercialName("상권").build());

        commercialWebFacade.getFootTrafficByPeriodCodeAndCommercialCode(null, "3110008");

        verify(commercialQueryProcessor).getFootTrafficByPeriodCodeAndCommercialCode("20261", "3110008");
    }

    @Test
    @DisplayName("트렌드는 해석된 분기를 추이의 기준(최신) 분기로 쓴다")
    void trendUsesTheResolvedPeriodAsItsLatest() {
        when(analysisPeriodCatalogProcessor.resolve("")).thenReturn("20261");

        commercialWebFacade.getTrend("", "3110008", "CS100001", CommercialTrendMetricType.SALES, 4);

        verify(commercialTrendQueryProcessor).getTrend("3110008", "CS100001", CommercialTrendMetricType.SALES, "20261", 4);
    }

    @Test
    @DisplayName("비교 조회는 분기를 해석해 바꿔 끼운 조건으로 Processor 를 부른다")
    void comparisonQueryCarriesTheResolvedPeriod() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn("20261");

        commercialWebFacade.compareCommercials(new CommercialComparisonQuery("3110008", "3110012", "CS100001", null));

        ArgumentCaptor<CommercialComparisonQuery> query = ArgumentCaptor.forClass(CommercialComparisonQuery.class);
        verify(commercialComparisonQueryProcessor).compareCommercials(query.capture());
        assertThat(query.getValue()).isEqualTo(new CommercialComparisonQuery("3110008", "3110012", "CS100001", "20261"));
    }

    @Test
    @DisplayName("기본 분기를 정할 수 없으면 503 예외가 그대로 나가고 Processor 는 부르지 않는다")
    void unavailableDefaultStopsBeforeTheProcessor() {
        when(analysisPeriodCatalogProcessor.resolve(null))
            .thenThrow(new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE));

        assertThatThrownBy(() -> commercialWebFacade.getTrend(null, "3110008", "CS100001", CommercialTrendMetricType.SALES, 4))
            .isInstanceOf(AnalysisPeriodException.class);

        verify(commercialTrendQueryProcessor, never()).getTrend(anyString(), anyString(), any(), anyString(), anyInt());
    }
}
