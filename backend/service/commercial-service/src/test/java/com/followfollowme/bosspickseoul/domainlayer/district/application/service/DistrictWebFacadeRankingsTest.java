package com.followfollowme.bosspickseoul.domainlayer.district.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictFootTrafficRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictSalesRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictRankingSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.bosspickseoul.domainlayer.district.application.common.PeriodCodeCalculator;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.ChangeDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.SalesAdministrationRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.SalesDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreAdministrationRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 자치구 전체 순위(이슈 #433)를 Facade → Processor → Presenter 실제 객체로 잇고 저장소 포트만 가짜로 둔다.
 *
 * <p>분기를 둘 다 생략하면 현재 분기는 적재 기준 기본 분기로, 비교 분기는 그 직전 분기로 해석돼 저장소 조회와 응답에 그대로 실리는지,
 * 순위가 표준 경쟁 순위로 매겨지고 결측 변화율(null)이 0 으로 바뀌지 않고 응답까지 가는지 본다.
 */
@ExtendWith(MockitoExtension.class)
class DistrictWebFacadeRankingsTest {

    private static final String DEFAULT_PERIOD = "20261";
    private static final String PREVIOUS_OF_DEFAULT = "20254";

    @Mock
    private ChangeDistrictRepositoryPort changeDistrictRepositoryPort;

    @Mock
    private FootTrafficDistrictRepositoryPort footTrafficDistrictRepositoryPort;

    @Mock
    private SalesDistrictRepositoryPort salesDistrictRepositoryPort;

    @Mock
    private SalesAdministrationRepositoryPort salesAdministrationRepositoryPort;

    @Mock
    private StoreDistrictRepositoryPort storeDistrictRepositoryPort;

    @Mock
    private StoreAdministrationRepositoryPort storeAdministrationRepositoryPort;

    @Mock
    private AnalysisViewPublishProcessor analysisViewPublishProcessor;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Test
    @DisplayName("분기를 생략하면 해석된 현재·직전 분기로 조회하고, 그 분기와 순위·결측 변화율을 응답에 싣는다")
    void omittedPeriodsAreResolvedAndCarriedToTheResponse() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn(DEFAULT_PERIOD);
        when(footTrafficDistrictRepositoryPort.findRankingsByFootTraffic(DEFAULT_PERIOD, PREVIOUS_OF_DEFAULT)).thenReturn(List.of(
            FootTrafficDistrictRankingQueryResult.builder().districtCode("11680").districtName("강남구").totalFootTraffic(900L)
                .footTrafficChangeRate(1.5).build(),
            FootTrafficDistrictRankingQueryResult.builder().districtCode("11140").districtName("중구").totalFootTraffic(500L)
                .footTrafficChangeRate(null).build(),
            FootTrafficDistrictRankingQueryResult.builder().districtCode("11215").districtName("광진구").totalFootTraffic(500L)
                .footTrafficChangeRate(-3.0).build(),
            FootTrafficDistrictRankingQueryResult.builder().districtCode("11380").districtName("은평구").totalFootTraffic(100L)
                .footTrafficChangeRate(0.0).build()));
        when(salesDistrictRepositoryPort.findRankingsBySales(DEFAULT_PERIOD, PREVIOUS_OF_DEFAULT)).thenReturn(List.of(
            SalesDistrictRankingQueryResult.builder().districtCode("11680").districtName("강남구").totalSalesAmount(10_000L)
                .salesChangeRate(null).build()));
        when(storeDistrictRepositoryPort.findRankingsByOpenedStore(DEFAULT_PERIOD, PREVIOUS_OF_DEFAULT)).thenReturn(List.of(
            StoreDistrictOpenedRankingQueryResult.builder().districtCode("11680").districtName("강남구").openedStoreCount(30L)
                .openingChangeRate(8.5).build()));
        when(storeDistrictRepositoryPort.findRankingsByClosedStore(DEFAULT_PERIOD, PREVIOUS_OF_DEFAULT)).thenReturn(List.of());

        DistrictRankingSummaryResponse response = facade().getDistrictRankings(null, null);

        assertThat(response.currentPeriodCode()).isEqualTo(DEFAULT_PERIOD);
        assertThat(response.previousPeriodCode()).isEqualTo(PREVIOUS_OF_DEFAULT);
        assertThat(response.footTrafficRankings())
            .extracting(DistrictFootTrafficRankingItem::rank, DistrictFootTrafficRankingItem::districtCode,
                DistrictFootTrafficRankingItem::totalFootTraffic, DistrictFootTrafficRankingItem::footTrafficChangeRate)
            .containsExactly(
                tuple(1, "11680", 900L, 1.5),
                tuple(2, "11140", 500L, null),
                tuple(2, "11215", 500L, -3.0),
                tuple(4, "11380", 100L, 0.0));
        assertThat(response.salesRankings())
            .extracting(DistrictSalesRankingItem::rank, DistrictSalesRankingItem::districtName, DistrictSalesRankingItem::salesChangeRate)
            .containsExactly(tuple(1, "강남구", null));
        assertThat(response.openedStoreRankings())
            .extracting(DistrictOpenedStoreRankingItem::rank, DistrictOpenedStoreRankingItem::openedStoreCount)
            .containsExactly(tuple(1, 30L));
        assertThat(response.closedStoreRankings()).isEmpty();
    }

    @Test
    @DisplayName("비교 분기를 명시하면 그 분기로 조회하고 응답에 싣는다")
    void explicitPreviousPeriodIsUsed() {
        when(analysisPeriodCatalogProcessor.resolve("20261")).thenReturn("20261");
        when(footTrafficDistrictRepositoryPort.findRankingsByFootTraffic("20261", "20253")).thenReturn(List.of());
        when(salesDistrictRepositoryPort.findRankingsBySales("20261", "20253")).thenReturn(List.of());
        when(storeDistrictRepositoryPort.findRankingsByOpenedStore("20261", "20253")).thenReturn(List.of());
        when(storeDistrictRepositoryPort.findRankingsByClosedStore("20261", "20253")).thenReturn(List.of());

        DistrictRankingSummaryResponse response = facade().getDistrictRankings("20261", "20253");

        assertThat(response.currentPeriodCode()).isEqualTo("20261");
        assertThat(response.previousPeriodCode()).isEqualTo("20253");
        assertThat(response.footTrafficRankings()).isEmpty();
    }

    private DistrictWebFacade facade() {
        DistrictQueryProcessor processor = new DistrictQueryProcessor(changeDistrictRepositoryPort, footTrafficDistrictRepositoryPort,
            salesDistrictRepositoryPort, salesAdministrationRepositoryPort, storeDistrictRepositoryPort, storeAdministrationRepositoryPort,
            new PeriodCodeCalculator());
        return new DistrictWebFacade(processor, new DistrictPresenter(), analysisViewPublishProcessor, analysisPeriodCatalogProcessor);
    }
}
