package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.AverageIncomeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ExpenseByCategoryItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByAgeGroupItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ResidentPopulationByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByGenderItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SchoolCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.IncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.SalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.FacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.SchoolCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficByAgeGroupInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.AverageIncomeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.ExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.IncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.ResidentPopulationByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.ResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesCountByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesCountByGenderInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesCountByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.ServiceCategoryInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommercialPresenter {

    public ServiceCategoryResponse toServiceCategoryResponse(ServiceCategoryInfo info) {
        return ServiceCategoryResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .serviceTypeCode(info.serviceType().name())
            .serviceTypeDescription(info.serviceType().getDescription())
            .build();
    }

    public List<ServiceCategoryResponse> toServiceCategoryResponses(List<ServiceCategoryInfo> infos) {
        return infos.stream()
            .map(this::toServiceCategoryResponse)
            .toList();
    }

    public FootTrafficResponse toFootTrafficResponse(FootTrafficInfo info) {
        return FootTrafficResponse.builder()
            .byTimeSlotItem(toFootTrafficByTimeSlotItem(info.byTimeSlotInfo()))
            .byDayOfWeekItem(toFootTrafficByDayOfWeekItem(info.byDayOfWeekInfo()))
            .byAgeGroupItem(toFootTrafficByAgeGroupItem(info.byAgeGroupInfo()))
            .byAgeGenderPercentItem(toFootTrafficByAgeGenderPercentItem(info.byAgeGenderPercentInfo()))
            .build();
    }

    public ResidentPopulationResponse toPopulationResponse(ResidentPopulationInfo info) {
        return ResidentPopulationResponse.builder()
            .byAgeItem(toResidentPopulationByAgeItem(info.byAgeInfo()))
            .malePercentage(info.malePercentage())
            .femalePercentage(info.femalePercentage())
            .build();
    }

    public IncomeAndExpenseResponse toIncomeResponse(IncomeAndExpenseInfo info) {
        return IncomeAndExpenseResponse.builder()
            .averageIncomeItem(toAverageIncomeItem(info.averageIncomeInfo()))
            .expenseByCategoryItem(toExpenseByCategoryItem(info.expenseByCategoryInfo()))
            .build();
    }

    public SalesResponse toSalesResponse(SalesInfo info) {
        return SalesResponse.builder()
            .amountByTimeSlotItem(toSalesByTimeSlotItem(info.amountByTimeSlotInfo()))
            .amountByDayOfWeekItem(toSalesByDayOfWeekItem(info.amountByDayOfWeekInfo()))
            .amountByAgeItem(toSalesByAgeItem(info.amountByAgeInfo()))
            .amountByAgeGenderPercentItem(toSalesByAgeGenderPercentItem(info.amountByAgeGenderPercentInfo()))
            .countByDayOfWeekItem(toSalesCountByDayOfWeekItem(info.countByDayOfWeekInfo()))
            .countByTimeSlotItem(toSalesCountByTimeSlotItem(info.countByTimeSlotInfo()))
            .countByGenderItem(toSalesCountByGenderItem(info.countByGenderInfo()))
            .build();
    }

    public FacilityResponse toFacilityResponse(FacilityInfo info) {
        return FacilityResponse.builder()
            .totalFacilityCount(info.totalFacilityCount())
            .schoolCountItem(toSchoolCountItem(info.schoolCountInfo()))
            .totalTransportationFacilityCount(info.totalTransportationFacilityCount())
            .build();
    }

    // FootTraffic Item Mappers
    private FootTrafficByTimeSlotItem toFootTrafficByTimeSlotItem(FootTrafficByTimeSlotInfo info) {
        return FootTrafficByTimeSlotItem.builder()
            .footTrafficTime00To06(info.footTrafficTime00To06())
            .footTrafficTime06To11(info.footTrafficTime06To11())
            .footTrafficTime11To14(info.footTrafficTime11To14())
            .footTrafficTime14To17(info.footTrafficTime14To17())
            .footTrafficTime17To21(info.footTrafficTime17To21())
            .footTrafficTime21To24(info.footTrafficTime21To24())
            .build();
    }

    private FootTrafficByDayOfWeekItem toFootTrafficByDayOfWeekItem(FootTrafficByDayOfWeekInfo info) {
        return FootTrafficByDayOfWeekItem.builder()
            .mondayFootTraffic(info.mondayFootTraffic())
            .tuesdayFootTraffic(info.tuesdayFootTraffic())
            .wednesdayFootTraffic(info.wednesdayFootTraffic())
            .thursdayFootTraffic(info.thursdayFootTraffic())
            .fridayFootTraffic(info.fridayFootTraffic())
            .saturdayFootTraffic(info.saturdayFootTraffic())
            .sundayFootTraffic(info.sundayFootTraffic())
            .build();
    }

    private FootTrafficByAgeGroupItem toFootTrafficByAgeGroupItem(FootTrafficByAgeGroupInfo info) {
        return FootTrafficByAgeGroupItem.builder()
            .age10FootTraffic(info.age10FootTraffic())
            .age20FootTraffic(info.age20FootTraffic())
            .age30FootTraffic(info.age30FootTraffic())
            .age40FootTraffic(info.age40FootTraffic())
            .age50FootTraffic(info.age50FootTraffic())
            .age60PlusFootTraffic(info.age60PlusFootTraffic())
            .build();
    }

    private FootTrafficByAgeGenderPercentItem toFootTrafficByAgeGenderPercentItem(FootTrafficByAgeGenderPercentInfo info) {
        return FootTrafficByAgeGenderPercentItem.builder()
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
    private SalesByTimeSlotItem toSalesByTimeSlotItem(SalesByTimeSlotInfo info) {
        return SalesByTimeSlotItem.builder()
            .salesAmountTime00To06(info.salesAmountTime00To06())
            .salesAmountTime06To11(info.salesAmountTime06To11())
            .salesAmountTime11To14(info.salesAmountTime11To14())
            .salesAmountTime14To17(info.salesAmountTime14To17())
            .salesAmountTime17To21(info.salesAmountTime17To21())
            .salesAmountTime21To24(info.salesAmountTime21To24())
            .build();
    }

    private SalesByDayOfWeekItem toSalesByDayOfWeekItem(SalesByDayOfWeekInfo info) {
        return SalesByDayOfWeekItem.builder()
            .mondaySalesAmount(info.mondaySalesAmount())
            .tuesdaySalesAmount(info.tuesdaySalesAmount())
            .wednesdaySalesAmount(info.wednesdaySalesAmount())
            .thursdaySalesAmount(info.thursdaySalesAmount())
            .fridaySalesAmount(info.fridaySalesAmount())
            .saturdaySalesAmount(info.saturdaySalesAmount())
            .sundaySalesAmount(info.sundaySalesAmount())
            .build();
    }

    private SalesByAgeItem toSalesByAgeItem(SalesByAgeInfo info) {
        return SalesByAgeItem.builder()
            .age10SalesAmount(info.age10SalesAmount())
            .age20SalesAmount(info.age20SalesAmount())
            .age30SalesAmount(info.age30SalesAmount())
            .age40SalesAmount(info.age40SalesAmount())
            .age50SalesAmount(info.age50SalesAmount())
            .age60PlusSalesAmount(info.age60PlusSalesAmount())
            .build();
    }

    private SalesByAgeGenderPercentItem toSalesByAgeGenderPercentItem(SalesByAgeGenderPercentInfo info) {
        return SalesByAgeGenderPercentItem.builder()
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

    private SalesCountByDayOfWeekItem toSalesCountByDayOfWeekItem(SalesCountByDayOfWeekInfo info) {
        return SalesCountByDayOfWeekItem.builder()
            .mondaySalesCount(info.mondaySalesCount())
            .tuesdaySalesCount(info.tuesdaySalesCount())
            .wednesdaySalesCount(info.wednesdaySalesCount())
            .thursdaySalesCount(info.thursdaySalesCount())
            .fridaySalesCount(info.fridaySalesCount())
            .saturdaySalesCount(info.saturdaySalesCount())
            .sundaySalesCount(info.sundaySalesCount())
            .build();
    }

    private SalesCountByTimeSlotItem toSalesCountByTimeSlotItem(SalesCountByTimeSlotInfo info) {
        return SalesCountByTimeSlotItem.builder()
            .salesCountTime00To06(info.salesCountTime00To06())
            .salesCountTime06To11(info.salesCountTime06To11())
            .salesCountTime11To14(info.salesCountTime11To14())
            .salesCountTime14To17(info.salesCountTime14To17())
            .salesCountTime17To21(info.salesCountTime17To21())
            .salesCountTime21To24(info.salesCountTime21To24())
            .build();
    }

    private SalesCountByGenderItem toSalesCountByGenderItem(SalesCountByGenderInfo info) {
        return SalesCountByGenderItem.builder()
            .maleSalesCount(info.maleSalesCount())
            .femaleSalesCount(info.femaleSalesCount())
            .build();
    }

    // Facility Item Mappers
    private SchoolCountItem toSchoolCountItem(SchoolCountInfo info) {
        return SchoolCountItem.builder()
            .elementarySchoolCount(info.elementarySchoolCount())
            .middleSchoolCount(info.middleSchoolCount())
            .highSchoolCount(info.highSchoolCount())
            .universityCount(info.universityCount())
            .totalSchoolCount(info.totalSchoolCount())
            .build();
    }

    // Population Item Mappers
    private ResidentPopulationByAgeItem toResidentPopulationByAgeItem(ResidentPopulationByAgeInfo info) {
        return ResidentPopulationByAgeItem.builder()
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
    private AverageIncomeItem toAverageIncomeItem(AverageIncomeInfo info) {
        return AverageIncomeItem.builder()
            .monthlyAverageIncomeAmount(info.monthlyAverageIncomeAmount())
            .incomeBracketCode(info.incomeBracketCode())
            .build();
    }

    private ExpenseByCategoryItem toExpenseByCategoryItem(ExpenseByCategoryInfo info) {
        return ExpenseByCategoryItem.builder()
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
