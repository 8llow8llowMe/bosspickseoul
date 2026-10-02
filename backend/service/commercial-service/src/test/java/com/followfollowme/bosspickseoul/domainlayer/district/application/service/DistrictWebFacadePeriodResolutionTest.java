package com.followfollowme.bosspickseoul.domainlayer.district.application.service;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Named;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 자치구 유스케이스 9종이 모두 생략된 현재 분기를 적재 기준 기본 분기로 해석해 Processor 에 넘기는지 확인한다(이슈 #464).
 * 비교 분기는 넘긴 그대로(null) 두고, Processor 가 해석된 현재 분기 기준으로 직전 분기를 정한다
 * ({@code DistrictQueryProcessorPeriodTest}).
 */
@ExtendWith(MockitoExtension.class)
class DistrictWebFacadePeriodResolutionTest {

    private static final String DEFAULT_PERIOD = "20261";
    private static final String DISTRICT = "11110";

    @Mock
    private DistrictQueryProcessor districtQueryProcessor;

    @Mock
    private DistrictPresenter districtPresenter;

    @Mock
    private AnalysisViewPublishProcessor analysisViewPublishProcessor;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    /** 유스케이스 하나: Facade 호출과, Processor 가 해석된 현재 분기로 불렸는지 확인하는 검증. */
    private record UseCase(Consumer<DistrictWebFacade> call, Consumer<DistrictQueryProcessor> expectation) {
    }

    static Stream<Arguments> useCases() {
        return Stream.of(
            useCase("Top10", facade -> facade.getTopTenDistricts(null, null),
                processor -> processor.getTopTenSummary(DEFAULT_PERIOD, null)),
            useCase("전체 순위", facade -> facade.getDistrictRankings(null, null),
                processor -> processor.getRankingSummary(DEFAULT_PERIOD, null)),
            useCase("상세", facade -> facade.getDistrictDetail(DISTRICT, null, null),
                processor -> processor.getDistrictDetail(DISTRICT, DEFAULT_PERIOD, null)),
            useCase("유동인구", facade -> facade.getDistrictFootTrafficDetail(DISTRICT, null, null),
                processor -> processor.getDistrictFootTrafficDetail(DISTRICT, DEFAULT_PERIOD, null)),
            useCase("변화지표", facade -> facade.getDistrictChangeDetail(DISTRICT, null),
                processor -> processor.getDistrictChangeDetail(DISTRICT, DEFAULT_PERIOD)),
            useCase("점포", facade -> facade.getDistrictTotalStoreDetail(DISTRICT, null),
                processor -> processor.getDistrictTotalStoreDetail(DISTRICT, DEFAULT_PERIOD)),
            useCase("매출 상위 업종", facade -> facade.getDistrictSalesTopFiveDetail(DISTRICT, null, null),
                processor -> processor.getDistrictSalesTopFiveDetail(DISTRICT, DEFAULT_PERIOD, null)),
            useCase("행정동 매출 상위", facade -> facade.getDistrictSalesAdministrationTopFiveDetail(DISTRICT, null, null),
                processor -> processor.getDistrictSalesAdministrationTopFiveDetail(DISTRICT, DEFAULT_PERIOD, null)),
            useCase("자치구 목록", facade -> facade.getAllDistricts(null),
                processor -> processor.getAllDistricts(DEFAULT_PERIOD)));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("useCases")
    @DisplayName("생략된 현재 분기를 해석된 기본 분기로 Processor 에 넘기고 비교 분기는 그대로 둔다")
    void omittedCurrentPeriodIsResolved(UseCase useCase) {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn(DEFAULT_PERIOD);
        // 상세는 인기 순위 이벤트에 자치구명을 실어 보내므로 Info 가 필요하다. 다른 경로에서는 쓰이지 않아 lenient 다.
        lenient().when(districtQueryProcessor.getDistrictDetail(DISTRICT, DEFAULT_PERIOD, null))
            .thenReturn(DistrictDetailInfo.builder().districtName("종로구").build());

        useCase.call().accept(facade());

        useCase.expectation().accept(verify(districtQueryProcessor));
    }

    @Test
    @DisplayName("명시한 현재 분기는 그대로 넘긴다")
    void explicitCurrentPeriodPassesThrough() {
        when(analysisPeriodCatalogProcessor.resolve("20233")).thenReturn("20233");

        facade().getDistrictChangeDetail(DISTRICT, "20233");

        verify(districtQueryProcessor).getDistrictChangeDetail(DISTRICT, "20233");
    }

    private DistrictWebFacade facade() {
        return new DistrictWebFacade(districtQueryProcessor, districtPresenter, analysisViewPublishProcessor, analysisPeriodCatalogProcessor);
    }

    private static Arguments useCase(String name, Consumer<DistrictWebFacade> call, Consumer<DistrictQueryProcessor> expectation) {
        return Arguments.of(Named.of(name, new UseCase(call, expectation)));
    }
}
