package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileKeyMetricsInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialProfileQueryProcessor {

    private static final String[] TIME_SLOT_LABELS =
        {"0시~6시", "6시~11시", "11시~14시", "14시~17시", "17시~21시", "21시~24시"};
    private static final String[] AGE_GROUP_LABELS =
        {"10대", "20대", "30대", "40대", "50대", "60대 이상"};

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    public CommercialProfileInfo getProfile(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo sales = commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        CommercialFootTrafficInfo footTraffic = commercialQueryProcessor
            .getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        CommercialStoreAnalysisInfo store = commercialQueryProcessor
            .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        CommercialResidentPopulationInfo population = commercialQueryProcessor
            .getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        CommercialIncomeAndExpenseInfo income = commercialQueryProcessor
            .getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        CommercialFacilityInfo facility = commercialQueryProcessor
            .getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        CommercialAdministrationQueryResult administration =
            commercialRegionQueryPort.getCommercialAdministration(commercialCode);

        CommercialProfileKeyMetricsInfo keyMetrics = CommercialProfileKeyMetricsInfo.builder()
            .totalSalesAmount(totalSalesAmount(sales.amountByDayOfWeekInfo()))
            .totalFootTraffic(totalFootTraffic(footTraffic.byDayOfWeekInfo()))
            .totalStoreCount(store.totalStoreCount())
            .similarStoreCount(store.similarStoreCount())
            .openingRate(store.openingRate())
            .closureRate(store.closureRate())
            .totalResidentPopulation(population.byAgeInfo().totalResidentPopulation())
            .monthlyAverageIncomeAmount(income.averageIncomeInfo().monthlyAverageIncomeAmount())
            .totalFacilityCount(facility.totalFacilityCount())
            .peakSalesTimeSlot(peakSalesTimeSlot(sales.amountByTimeSlotInfo()))
            .peakFootTrafficTimeSlot(peakFootTrafficTimeSlot(footTraffic.byTimeSlotInfo()))
            .dominantSalesAgeGroup(dominantSalesAgeGroup(sales.amountByAgeInfo()))
            .build();

        return CommercialProfileInfo.builder()
            .periodCode(periodCode)
            .serviceCode(serviceCode)
            .commercialCode(commercialCode)
            .commercialName(sales.commercialName())
            .districtCode(administration.districtCode())
            .districtName(administration.districtName())
            .administrationCode(administration.administrationCode())
            .administrationName(administration.administrationName())
            .keyMetrics(keyMetrics)
            .build();
    }

    private static double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount()
            + info.thursdaySalesAmount() + info.fridaySalesAmount()
            + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private static double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic()
            + info.thursdayFootTraffic() + info.fridayFootTraffic()
            + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private static String peakSalesTimeSlot(CommercialSalesByTimeSlotInfo slot) {
        long[] amounts = {
            slot.salesAmountTime00To06(), slot.salesAmountTime06To11(),
            slot.salesAmountTime11To14(), slot.salesAmountTime14To17(),
            slot.salesAmountTime17To21(), slot.salesAmountTime21To24()
        };
        return TIME_SLOT_LABELS[peakIndex(amounts)];
    }

    private static String peakFootTrafficTimeSlot(CommercialFootTrafficByTimeSlotInfo slot) {
        long[] amounts = {
            slot.footTrafficTime00To06(), slot.footTrafficTime06To11(),
            slot.footTrafficTime11To14(), slot.footTrafficTime14To17(),
            slot.footTrafficTime17To21(), slot.footTrafficTime21To24()
        };
        return TIME_SLOT_LABELS[peakIndex(amounts)];
    }

    private static String dominantSalesAgeGroup(CommercialSalesByAgeInfo age) {
        long[] amounts = {
            age.age10SalesAmount(), age.age20SalesAmount(), age.age30SalesAmount(),
            age.age40SalesAmount(), age.age50SalesAmount(), age.age60PlusSalesAmount()
        };
        return AGE_GROUP_LABELS[peakIndex(amounts)];
    }

    private static int peakIndex(long[] amounts) {
        int peak = 0;
        for (int i = 1; i < amounts.length; i++) {
            if (amounts[i] > amounts[peak]) {
                peak = i;
            }
        }
        return peak;
    }
}
