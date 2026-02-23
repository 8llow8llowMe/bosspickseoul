package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAverageIncomeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseByCategoryItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGroupItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialResidentPopulationByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByGenderItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialSchoolCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGroupInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialAverageIncomeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByGenderInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommercialPresenter {

    public CommercialServiceCategoryResponse toCommercialServiceCategoryResponse(CommercialServiceCategoryInfo info) {
        return CommercialServiceCategoryResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .serviceTypeCode(info.serviceType().name())
            .serviceTypeDescription(info.serviceType().getDescription())
            .build();
    }

    public List<CommercialServiceCategoryResponse> toCommercialServiceCategoryResponses(List<CommercialServiceCategoryInfo> infos) {
        return infos.stream()
            .map(this::toCommercialServiceCategoryResponse)
            .toList();
    }

    public CommercialFootTrafficResponse toCommercialFootTrafficResponse(CommercialFootTrafficInfo info) {
        return CommercialFootTrafficResponse.builder()
            .byTimeSlotItem(toCommercialFootTrafficByTimeSlotItem(info.byTimeSlotInfo()))
            .byDayOfWeekItem(toCommercialFootTrafficByDayOfWeekItem(info.byDayOfWeekInfo()))
            .byAgeGroupItem(toCommercialFootTrafficByAgeGroupItem(info.byAgeGroupInfo()))
            .byAgeGenderPercentItem(toCommercialFootTrafficByAgeGenderPercentItem(info.byAgeGenderPercentInfo()))
            .build();
    }

    public CommercialResidentPopulationResponse toCommercialPopulationResponse(CommercialResidentPopulationInfo info) {
        return CommercialResidentPopulationResponse.builder()
            .byAgeItem(toCommercialResidentPopulationByAgeItem(info.byAgeInfo()))
            .malePercentage(info.malePercentage())
            .femalePercentage(info.femalePercentage())
            .build();
    }

    public CommercialIncomeAndExpenseResponse toCommercialIncomeResponse(CommercialIncomeAndExpenseInfo info) {
        return CommercialIncomeAndExpenseResponse.builder()
            .averageIncomeItem(toCommercialAverageIncomeItem(info.averageIncomeInfo()))
            .expenseByCategoryItem(toCommercialExpenseByCategoryItem(info.expenseByCategoryInfo()))
            .build();
    }

    public CommercialSalesResponse toCommercialSalesResponse(CommercialSalesInfo info) {
        return CommercialSalesResponse.builder()
            .amountByTimeSlotItem(toCommercialSalesByTimeSlotItem(info.amountByTimeSlotInfo()))
            .amountByDayOfWeekItem(toCommercialSalesByDayOfWeekItem(info.amountByDayOfWeekInfo()))
            .amountByAgeItem(toCommercialSalesByAgeItem(info.amountByAgeInfo()))
            .amountByAgeGenderPercentItem(toCommercialSalesByAgeGenderPercentItem(info.amountByAgeGenderPercentInfo()))
            .countByDayOfWeekItem(toCommercialSalesCountByDayOfWeekItem(info.countByDayOfWeekInfo()))
            .countByTimeSlotItem(toCommercialSalesCountByTimeSlotItem(info.countByTimeSlotInfo()))
            .countByGenderItem(toCommercialSalesCountByGenderItem(info.countByGenderInfo()))
            .build();
    }

    public CommercialFacilityResponse toCommercialFacilityResponse(CommercialFacilityInfo info) {
        return CommercialFacilityResponse.builder()
            .totalFacilityCount(info.totalFacilityCount())
            .schoolCountItem(toCommercialSchoolCountItem(info.schoolCountInfo()))
            .totalTransportationFacilityCount(info.totalTransportationFacilityCount())
            .build();
    }

    // FootTraffic Item Mappers
    private CommercialFootTrafficByTimeSlotItem toCommercialFootTrafficByTimeSlotItem(CommercialFootTrafficByTimeSlotInfo info) {
        return CommercialFootTrafficByTimeSlotItem.builder()
            .footTrafficTime00To06(info.footTrafficTime00To06())
            .footTrafficTime06To11(info.footTrafficTime06To11())
            .footTrafficTime11To14(info.footTrafficTime11To14())
            .footTrafficTime14To17(info.footTrafficTime14To17())
            .footTrafficTime17To21(info.footTrafficTime17To21())
            .footTrafficTime21To24(info.footTrafficTime21To24())
            .build();
    }

    private CommercialFootTrafficByDayOfWeekItem toCommercialFootTrafficByDayOfWeekItem(CommercialFootTrafficByDayOfWeekInfo info) {
        return CommercialFootTrafficByDayOfWeekItem.builder()
            .mondayFootTraffic(info.mondayFootTraffic())
            .tuesdayFootTraffic(info.tuesdayFootTraffic())
            .wednesdayFootTraffic(info.wednesdayFootTraffic())
            .thursdayFootTraffic(info.thursdayFootTraffic())
            .fridayFootTraffic(info.fridayFootTraffic())
            .saturdayFootTraffic(info.saturdayFootTraffic())
            .sundayFootTraffic(info.sundayFootTraffic())
            .build();
    }

    private CommercialFootTrafficByAgeGroupItem toCommercialFootTrafficByAgeGroupItem(CommercialFootTrafficByAgeGroupInfo info) {
        return CommercialFootTrafficByAgeGroupItem.builder()
            .age10FootTraffic(info.age10FootTraffic())
            .age20FootTraffic(info.age20FootTraffic())
            .age30FootTraffic(info.age30FootTraffic())
            .age40FootTraffic(info.age40FootTraffic())
            .age50FootTraffic(info.age50FootTraffic())
            .age60PlusFootTraffic(info.age60PlusFootTraffic())
            .build();
    }

    private CommercialFootTrafficByAgeGenderPercentItem toCommercialFootTrafficByAgeGenderPercentItem(CommercialFootTrafficByAgeGenderPercentInfo info) {
        return CommercialFootTrafficByAgeGenderPercentItem.builder()
            .maleAge10Percent(info.maleAge10Percent())
            .femaleAge10Percent(info.femaleAge10Percent())
            .maleAge20Percent(info.maleAge20Percent())
            .femaleAge20Percent(info.femaleAge20Percent())
            .maleAge30Percent(info.maleAge30Percent())
            .femaleAge30Percent(info.femaleAge30Percent())
            .maleAge40Percent(info.maleAge40Percent())
            .femaleAge40Percent(info.femaleAge40Percent())
            .maleAge50Percent(info.maleAge50Percent())
            .femaleAge50Percent(info.femaleAge50Percent())
            .maleAge60PlusPercent(info.maleAge60PlusPercent())
            .femaleAge60PlusPercent(info.femaleAge60PlusPercent())
            .build();
    }

    // Sales Item Mappers
    private CommercialSalesByTimeSlotItem toCommercialSalesByTimeSlotItem(CommercialSalesByTimeSlotInfo info) {
        return CommercialSalesByTimeSlotItem.builder()
            .salesAmountTime00To06(info.salesAmountTime00To06())
            .salesAmountTime06To11(info.salesAmountTime06To11())
            .salesAmountTime11To14(info.salesAmountTime11To14())
            .salesAmountTime14To17(info.salesAmountTime14To17())
            .salesAmountTime17To21(info.salesAmountTime17To21())
            .salesAmountTime21To24(info.salesAmountTime21To24())
            .build();
    }

    private CommercialSalesByDayOfWeekItem toCommercialSalesByDayOfWeekItem(CommercialSalesByDayOfWeekInfo info) {
        return CommercialSalesByDayOfWeekItem.builder()
            .mondaySalesAmount(info.mondaySalesAmount())
            .tuesdaySalesAmount(info.tuesdaySalesAmount())
            .wednesdaySalesAmount(info.wednesdaySalesAmount())
            .thursdaySalesAmount(info.thursdaySalesAmount())
            .fridaySalesAmount(info.fridaySalesAmount())
            .saturdaySalesAmount(info.saturdaySalesAmount())
            .sundaySalesAmount(info.sundaySalesAmount())
            .build();
    }

    private CommercialSalesByAgeItem toCommercialSalesByAgeItem(CommercialSalesByAgeInfo info) {
        return CommercialSalesByAgeItem.builder()
            .age10SalesAmount(info.age10SalesAmount())
            .age20SalesAmount(info.age20SalesAmount())
            .age30SalesAmount(info.age30SalesAmount())
            .age40SalesAmount(info.age40SalesAmount())
            .age50SalesAmount(info.age50SalesAmount())
            .age60PlusSalesAmount(info.age60PlusSalesAmount())
            .build();
    }

    private CommercialSalesByAgeGenderPercentItem toCommercialSalesByAgeGenderPercentItem(CommercialSalesByAgeGenderPercentInfo info) {
        return CommercialSalesByAgeGenderPercentItem.builder()
            .maleAge10Percent(info.maleAge10Percent())
            .femaleAge10Percent(info.femaleAge10Percent())
            .maleAge20Percent(info.maleAge20Percent())
            .femaleAge20Percent(info.femaleAge20Percent())
            .maleAge30Percent(info.maleAge30Percent())
            .femaleAge30Percent(info.femaleAge30Percent())
            .maleAge40Percent(info.maleAge40Percent())
            .femaleAge40Percent(info.femaleAge40Percent())
            .maleAge50Percent(info.maleAge50Percent())
            .femaleAge50Percent(info.femaleAge50Percent())
            .maleAge60PlusPercent(info.maleAge60PlusPercent())
            .femaleAge60PlusPercent(info.femaleAge60PlusPercent())
            .build();
    }

    private CommercialSalesCountByDayOfWeekItem toCommercialSalesCountByDayOfWeekItem(CommercialSalesCountByDayOfWeekInfo info) {
        return CommercialSalesCountByDayOfWeekItem.builder()
            .mondaySalesCount(info.mondaySalesCount())
            .tuesdaySalesCount(info.tuesdaySalesCount())
            .wednesdaySalesCount(info.wednesdaySalesCount())
            .thursdaySalesCount(info.thursdaySalesCount())
            .fridaySalesCount(info.fridaySalesCount())
            .saturdaySalesCount(info.saturdaySalesCount())
            .sundaySalesCount(info.sundaySalesCount())
            .build();
    }

    private CommercialSalesCountByTimeSlotItem toCommercialSalesCountByTimeSlotItem(CommercialSalesCountByTimeSlotInfo info) {
        return CommercialSalesCountByTimeSlotItem.builder()
            .salesCountTime00To06(info.salesCountTime00To06())
            .salesCountTime06To11(info.salesCountTime06To11())
            .salesCountTime11To14(info.salesCountTime11To14())
            .salesCountTime14To17(info.salesCountTime14To17())
            .salesCountTime17To21(info.salesCountTime17To21())
            .salesCountTime21To24(info.salesCountTime21To24())
            .build();
    }

    private CommercialSalesCountByGenderItem toCommercialSalesCountByGenderItem(CommercialSalesCountByGenderInfo info) {
        return CommercialSalesCountByGenderItem.builder()
            .maleSalesCount(info.maleSalesCount())
            .femaleSalesCount(info.femaleSalesCount())
            .build();
    }

    // Facility Item Mappers
    private CommercialSchoolCountItem toCommercialSchoolCountItem(CommercialSchoolCountInfo info) {
        return CommercialSchoolCountItem.builder()
            .elementarySchoolCount(info.elementarySchoolCount())
            .middleSchoolCount(info.middleSchoolCount())
            .highSchoolCount(info.highSchoolCount())
            .universityCount(info.universityCount())
            .totalSchoolCount(info.totalSchoolCount())
            .build();
    }

    // Population Item Mappers
    private CommercialResidentPopulationByAgeItem toCommercialResidentPopulationByAgeItem(CommercialResidentPopulationByAgeInfo info) {
        return CommercialResidentPopulationByAgeItem.builder()
            .totalResidentPopulation(info.totalResidentPopulation())
            .age10ResidentPopulation(info.age10ResidentPopulation())
            .age20ResidentPopulation(info.age20ResidentPopulation())
            .age30ResidentPopulation(info.age30ResidentPopulation())
            .age40ResidentPopulation(info.age40ResidentPopulation())
            .age50ResidentPopulation(info.age50ResidentPopulation())
            .age60PlusResidentPopulation(info.age60PlusResidentPopulation())
            .build();
    }

    // Income Item Mappers
    private CommercialAverageIncomeItem toCommercialAverageIncomeItem(CommercialAverageIncomeInfo info) {
        return CommercialAverageIncomeItem.builder()
            .monthlyAverageIncomeAmount(info.monthlyAverageIncomeAmount())
            .incomeBracketCode(info.incomeBracketCode())
            .build();
    }

    private CommercialExpenseByCategoryItem toCommercialExpenseByCategoryItem(CommercialExpenseByCategoryInfo info) {
        return CommercialExpenseByCategoryItem.builder()
            .groceryExpenseAmount(info.groceryExpenseAmount())
            .clothingExpenseAmount(info.clothingExpenseAmount())
            .medicalExpenseAmount(info.medicalExpenseAmount())
            .householdExpenseAmount(info.householdExpenseAmount())
            .transportationExpenseAmount(info.transportationExpenseAmount())
            .leisureExpenseAmount(info.leisureExpenseAmount())
            .cultureExpenseAmount(info.cultureExpenseAmount())
            .educationExpenseAmount(info.educationExpenseAmount())
            .entertainmentExpenseAmount(info.entertainmentExpenseAmount())
            .build();
    }
}
