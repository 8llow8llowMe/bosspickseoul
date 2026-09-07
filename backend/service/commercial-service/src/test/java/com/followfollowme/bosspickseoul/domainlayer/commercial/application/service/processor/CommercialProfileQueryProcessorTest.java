package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationByAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommercialProfileQueryProcessorTest {

    private static final String PERIOD = "20233";
    private static final String COMMERCIAL = "3110971";
    private static final String SERVICE = "CS100001";

    @Mock
    private CommercialQueryProcessor commercialQueryProcessor;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @InjectMocks
    private CommercialProfileQueryProcessor processor;

    @Test
    void getProfile_salesAbsent_degradesSalesMetricsToNullInsteadOfFailing() {
        // 이슈 #229 재현 조건: 해당 분기 매출만 없음 — 프로필 전체가 404/503 이 되면 안 된다
        givenAdministration();
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenThrow(new CommercialException(CommercialErrorCode.SALES_NOT_FOUND));
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(footTraffic());
        when(commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenReturn(store());
        when(commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(population());
        when(commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(income());
        when(commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(facility());

        CommercialProfileInfo profile = processor.getProfile(PERIOD, COMMERCIAL, SERVICE);

        assertThat(profile.keyMetrics().totalSalesAmount()).isNull();
        assertThat(profile.keyMetrics().peakSalesTimeSlot()).isNull();
        assertThat(profile.keyMetrics().dominantSalesAgeGroup()).isNull();
        assertThat(profile.keyMetrics().totalFootTraffic()).isEqualTo(700D);
        assertThat(profile.keyMetrics().peakFootTrafficTimeSlot()).isEqualTo("17시~21시");
        assertThat(profile.keyMetrics().totalStoreCount()).isEqualTo(120L);
        assertThat(profile.keyMetrics().monthlyAverageIncomeAmount()).isEqualTo(3_500_000L);
        // 상권명은 매출 Info 가 없으니 유동인구 Info 로 폴백
        assertThat(profile.commercialName()).isEqualTo("선정릉역 4번");
        assertThat(profile.districtName()).isEqualTo("강남구");
    }

    @Test
    void getProfile_allMetricsPresent_buildsFullKeyMetrics() {
        givenAdministration();
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenReturn(sales());
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(footTraffic());
        when(commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenReturn(store());
        when(commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(population());
        when(commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(income());
        when(commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(facility());

        CommercialProfileInfo profile = processor.getProfile(PERIOD, COMMERCIAL, SERVICE);

        assertThat(profile.commercialName()).isEqualTo("선정릉역 4번 출구");
        assertThat(profile.keyMetrics().totalSalesAmount()).isEqualTo(2_800D);
        assertThat(profile.keyMetrics().peakSalesTimeSlot()).isEqualTo("11시~14시");
        assertThat(profile.keyMetrics().dominantSalesAgeGroup()).isEqualTo("30대");
        assertThat(profile.keyMetrics().totalResidentPopulation()).isEqualTo(5_000L);
        assertThat(profile.keyMetrics().totalFacilityCount()).isEqualTo(42L);
    }

    @Test
    void getProfile_allMetricsAbsent_throwsProfileDataNotFound() {
        givenAdministration();
        CommercialException notFound = new CommercialException(CommercialErrorCode.SALES_NOT_FOUND);
        when(commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenThrow(notFound);
        when(commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenThrow(notFound);
        when(commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenThrow(notFound);
        when(commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenThrow(notFound);
        when(commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenThrow(notFound);
        when(commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(PERIOD, COMMERCIAL))
            .thenThrow(notFound);

        assertThatThrownBy(() -> processor.getProfile(PERIOD, COMMERCIAL, SERVICE))
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.PROFILE_DATA_NOT_FOUND);
    }

    @Test
    void getProfile_regionLookupFailure_propagatesWithoutDegrading() {
        // 지역 매핑(상권 코드 검증)은 프로필의 골격이라 강등하지 않는다
        when(commercialRegionQueryPort.getCommercialAdministration(anyString()))
            .thenThrow(new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND));

        assertThatThrownBy(() -> processor.getProfile(PERIOD, "9999999", SERVICE))
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.COMMERCIAL_NOT_FOUND);
    }

    private void givenAdministration() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenReturn(new CommercialAdministrationQueryResult("11680", "강남구", "11680640", "역삼1동"));
    }

    private CommercialSalesInfo sales() {
        return CommercialSalesInfo.builder()
            .commercialName("선정릉역 4번 출구")
            .amountByDayOfWeekInfo(CommercialSalesByDayOfWeekInfo.builder()
                .mondaySalesAmount(400).tuesdaySalesAmount(400).wednesdaySalesAmount(400)
                .thursdaySalesAmount(400).fridaySalesAmount(400)
                .saturdaySalesAmount(400).sundaySalesAmount(400)
                .build())
            .amountByTimeSlotInfo(CommercialSalesByTimeSlotInfo.builder()
                .salesAmountTime00To06(10).salesAmountTime06To11(20)
                .salesAmountTime11To14(90).salesAmountTime14To17(30)
                .salesAmountTime17To21(40).salesAmountTime21To24(50)
                .build())
            .amountByAgeInfo(CommercialSalesByAgeInfo.builder()
                .age10SalesAmount(10).age20SalesAmount(20).age30SalesAmount(90)
                .age40SalesAmount(30).age50SalesAmount(40).age60PlusSalesAmount(50)
                .build())
            .build();
    }

    private CommercialFootTrafficInfo footTraffic() {
        return CommercialFootTrafficInfo.builder()
            .commercialName("선정릉역 4번")
            .byDayOfWeekInfo(CommercialFootTrafficByDayOfWeekInfo.builder()
                .mondayFootTraffic(100).tuesdayFootTraffic(100).wednesdayFootTraffic(100)
                .thursdayFootTraffic(100).fridayFootTraffic(100)
                .saturdayFootTraffic(100).sundayFootTraffic(100)
                .build())
            .byTimeSlotInfo(CommercialFootTrafficByTimeSlotInfo.builder()
                .footTrafficTime00To06(10).footTrafficTime06To11(20)
                .footTrafficTime11To14(30).footTrafficTime14To17(40)
                .footTrafficTime17To21(90).footTrafficTime21To24(50)
                .build())
            .build();
    }

    private CommercialStoreAnalysisInfo store() {
        return CommercialStoreAnalysisInfo.builder()
            .totalStoreCount(120)
            .similarStoreCount(15)
            .openingRate(3.2)
            .closureRate(1.1)
            .peerStores(List.of())
            .build();
    }

    private CommercialResidentPopulationInfo population() {
        return CommercialResidentPopulationInfo.builder()
            .byAgeInfo(CommercialResidentPopulationByAgeInfo.builder()
                .totalResidentPopulation(5_000)
                .build())
            .build();
    }

    private CommercialIncomeAndExpenseInfo income() {
        return CommercialIncomeAndExpenseInfo.builder()
            .averageIncomeInfo(CommercialAverageIncomeInfo.builder()
                .monthlyAverageIncomeAmount(3_500_000)
                .build())
            .build();
    }

    private CommercialFacilityInfo facility() {
        return CommercialFacilityInfo.builder()
            .totalFacilityCount(42)
            .build();
    }
}
