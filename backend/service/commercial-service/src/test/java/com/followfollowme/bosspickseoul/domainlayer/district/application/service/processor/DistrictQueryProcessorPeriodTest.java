package com.followfollowme.bosspickseoul.domainlayer.district.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.district.application.common.PeriodCodeCalculator;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesAdministrationDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.ChangeDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.SalesAdministrationRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.SalesDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreAdministrationRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 비교 분기가 <b>해석된</b> 현재 분기 기준으로 정해지고, 실제로 조회한 두 분기가 Info 에 실리는지 확인한다(이슈 #464).
 *
 * <p>Facade 가 생략된 현재 분기를 적재 기준 기본 분기로 바꿔 넘기므로 Processor 는 해석된 값만 받는다. 그 값으로
 * {@link PeriodCodeCalculator#resolvePreviousPeriodCode} 가 직전 분기를 고르는지가 요점이다.
 */
@ExtendWith(MockitoExtension.class)
class DistrictQueryProcessorPeriodTest {

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

    @Test
    @DisplayName("비교 분기를 생략하면 해석된 현재 분기의 직전 분기로 조회하고 두 분기를 Info 에 싣는다")
    void previousPeriodFollowsTheResolvedCurrentPeriod() {
        when(footTrafficDistrictRepositoryPort.findTopTenByFootTraffic("20261", "20254")).thenReturn(List.of());
        when(salesDistrictRepositoryPort.findTopTenBySales("20261", "20254")).thenReturn(List.of());
        when(storeDistrictRepositoryPort.findTopTenByOpenedStore("20261", "20254")).thenReturn(List.of());
        when(storeDistrictRepositoryPort.findTopTenByClosedStore("20261", "20254")).thenReturn(List.of());

        DistrictTopTenSummaryInfo info = processor().getTopTenSummary("20261", null);

        assertThat(info.currentPeriodCode()).isEqualTo("20261");
        assertThat(info.previousPeriodCode()).isEqualTo("20254");
        verify(salesDistrictRepositoryPort).findTopTenBySales("20261", "20254");
    }

    @Test
    @DisplayName("행정동 매출 상위도 실제로 조회한 두 분기를 함께 돌려준다")
    void salesAdministrationTopFiveCarriesThePeriods() {
        when(salesAdministrationRepositoryPort.findTopFiveByDistrictCode("11110", "20261", "20253")).thenReturn(List.of());

        DistrictSalesAdministrationDetailInfo info = processor().getDistrictSalesAdministrationTopFiveDetail("11110", "20261", "20253");

        assertThat(info.currentPeriodCode()).isEqualTo("20261");
        assertThat(info.previousPeriodCode()).isEqualTo("20253");
        assertThat(info.topSalesAdministrations()).isEmpty();
    }

    private DistrictQueryProcessor processor() {
        return new DistrictQueryProcessor(changeDistrictRepositoryPort, footTrafficDistrictRepositoryPort, salesDistrictRepositoryPort,
            salesAdministrationRepositoryPort, storeDistrictRepositoryPort, storeAdministrationRepositoryPort, new PeriodCodeCalculator());
    }
}
