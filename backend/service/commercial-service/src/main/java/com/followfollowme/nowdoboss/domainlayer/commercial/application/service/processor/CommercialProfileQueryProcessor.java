package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileKeyMetricsInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialProfileQueryProcessor {

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    public CommercialProfileInfo getProfile(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo sales = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        CommercialFootTrafficInfo footTraffic = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        CommercialStoreAnalysisInfo store = commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        CommercialResidentPopulationInfo population = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        CommercialIncomeAndExpenseInfo income = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        CommercialFacilityInfo facility = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        CommercialAdministrationQueryResult administration = commercialRegionQueryPort.getCommercialAdministration(commercialCode);

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
            .build();

        return CommercialProfileInfo.builder()
            .commercialCode(commercialCode)
            .commercialName(sales.commercialName())
            .districtCode(administration.districtCode())
            .districtName(administration.districtName())
            .administrationCode(administration.administrationCode())
            .administrationName(administration.administrationName())
            .keyMetrics(keyMetrics)
            .build();
    }

    private double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount() + info.thursdaySalesAmount()
            + info.fridaySalesAmount() + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic() + info.thursdayFootTraffic()
            + info.fridayFootTraffic() + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }
}
