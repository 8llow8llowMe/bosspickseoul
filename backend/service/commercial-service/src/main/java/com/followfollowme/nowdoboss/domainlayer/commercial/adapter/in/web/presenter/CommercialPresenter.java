package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGenderPercentFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGenderPercentSalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGroupFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeSalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDayOfWeekFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDaySalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDaySalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialGenderSalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSlotFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeGenderPercentFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeGenderPercentSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeGroupFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialDayOfWeekFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialDaySalesCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialDaySalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialGenderSalesCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialSchoolCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialTimeSalesCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialTimeSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialTimeSlotFootTrafficInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommercialPresenter {

    public CommercialServiceCategoryResponse toServiceCategoryResponse(CommercialServiceCategoryInfo info) {
        return CommercialServiceCategoryResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceCodeName(info.serviceCodeName())
            .serviceTypeCode(info.serviceType().name())
            .serviceTypeDescription(info.serviceType().getDescription())
            .build();
    }

    public List<CommercialServiceCategoryResponse> toServiceCategoryResponses(List<CommercialServiceCategoryInfo> infos) {
        return infos.stream()
            .map(this::toServiceCategoryResponse)
            .toList();
    }

    public CommercialFootTrafficResponse toFootTrafficResponse(CommercialFootTrafficInfo info) {
        return CommercialFootTrafficResponse.builder()
            .timeSlotFootTrafficItem(toTimeSlotFootTrafficItem(info.timeSlotFootTrafficInfo()))
            .dayOfWeekFootTrafficItem(toDayOfWeekFootTrafficItem(info.dayOfWeekFootTrafficInfo()))
            .ageGroupFootTrafficItem(toAgeGroupFootTrafficItem(info.ageGroupFootTrafficInfo()))
            .ageGenderPercentFootTrafficItem(toAgeGenderPercentFootTrafficItem(info.ageGenderPercentFootTrafficInfo()))
            .build();
    }

    private CommercialTimeSlotFootTrafficItem toTimeSlotFootTrafficItem(CommercialTimeSlotFootTrafficInfo info) {
        return CommercialTimeSlotFootTrafficItem.builder()
            .footTraffic00(info.footTraffic00())
            .footTraffic06(info.footTraffic06())
            .footTraffic11(info.footTraffic11())
            .footTraffic14(info.footTraffic14())
            .footTraffic17(info.footTraffic17())
            .footTraffic21(info.footTraffic21())
            .build();
    }

    private CommercialDayOfWeekFootTrafficItem toDayOfWeekFootTrafficItem(CommercialDayOfWeekFootTrafficInfo info) {
        return CommercialDayOfWeekFootTrafficItem.builder()
            .monFootTraffic(info.monFootTraffic())
            .tueFootTraffic(info.tueFootTraffic())
            .wedFootTraffic(info.wedFootTraffic())
            .thuFootTraffic(info.thuFootTraffic())
            .friFootTraffic(info.friFootTraffic())
            .satFootTraffic(info.satFootTraffic())
            .sunFootTraffic(info.sunFootTraffic())
            .build();
    }

    private CommercialAgeGroupFootTrafficItem toAgeGroupFootTrafficItem(CommercialAgeGroupFootTrafficInfo info) {
        return CommercialAgeGroupFootTrafficItem.builder()
            .teenFootTraffic(info.teenFootTraffic())
            .twentyFootTraffic(info.twentyFootTraffic())
            .thirtyFootTraffic(info.thirtyFootTraffic())
            .fortyFootTraffic(info.fortyFootTraffic())
            .fiftyFootTraffic(info.fiftyFootTraffic())
            .sixtyFootTraffic(info.sixtyFootTraffic())
            .build();
    }

    private CommercialAgeGenderPercentFootTrafficItem toAgeGenderPercentFootTrafficItem(CommercialAgeGenderPercentFootTrafficInfo info) {
        return CommercialAgeGenderPercentFootTrafficItem.builder()
            .maleTeenFootTrafficPercent(info.maleTeenFootTrafficPercent())
            .femaleTeenFootTrafficPercent(info.femaleTeenFootTrafficPercent())
            .maleTwentyFootTrafficPercent(info.maleTwentyFootTrafficPercent())
            .femaleTwentyFootTrafficPercent(info.femaleTwentyFootTrafficPercent())
            .maleThirtyFootTrafficPercent(info.maleThirtyFootTrafficPercent())
            .femaleThirtyFootTrafficPercent(info.femaleThirtyFootTrafficPercent())
            .maleFortyFootTrafficPercent(info.maleFortyFootTrafficPercent())
            .femaleFortyFootTrafficPercent(info.femaleFortyFootTrafficPercent())
            .maleFiftyFootTrafficPercent(info.maleFiftyFootTrafficPercent())
            .femaleFiftyFootTrafficPercent(info.femaleFiftyFootTrafficPercent())
            .maleSixtyFootTrafficPercent(info.maleSixtyFootTrafficPercent())
            .femaleSixtyFootTrafficPercent(info.femaleSixtyFootTrafficPercent())
            .build();
    }

    public CommercialSalesResponse toSalesResponse(CommercialSalesInfo info) {
        return CommercialSalesResponse.builder()
            .timeSalesItem(toTimeSalesItem(info.timeSalesInfo()))
            .daySalesItem(toDaySalesItem(info.daySalesInfo()))
            .ageSalesItem(toAgeSalesItem(info.ageSalesInfo()))
            .ageGenderPercentSalesItem(toAgeGenderPercentSalesItem(info.ageGenderPercentSalesInfo()))
            .daySalesCountItem(toDaySalesCountItem(info.daySalesCountInfo()))
            .timeSalesCountItem(toTimeSalesCountItem(info.timeSalesCountInfo()))
            .genderSalesCountItem(toGenderSalesCountItem(info.genderSalesCountInfo()))
            .build();
    }

    public CommercialFacilityResponse toFacilityResponse(CommercialFacilityInfo info) {
        return CommercialFacilityResponse.builder()
            .facilityCount(info.facilityCount())
            .schoolCountItem(toSchoolCountItem(info.schoolCountInfo()))
            .transportCount(info.transportCount())
            .build();
    }

    private CommercialTimeSalesItem toTimeSalesItem(CommercialTimeSalesInfo info) {
        return CommercialTimeSalesItem.builder()
            .sales00(info.sales00())
            .sales06(info.sales06())
            .sales11(info.sales11())
            .sales14(info.sales14())
            .sales17(info.sales17())
            .sales21(info.sales21())
            .build();
    }

    private CommercialDaySalesItem toDaySalesItem(CommercialDaySalesInfo info) {
        return CommercialDaySalesItem.builder()
            .monSales(info.monSales())
            .tueSales(info.tueSales())
            .wedSales(info.wedSales())
            .thuSales(info.thuSales())
            .friSales(info.friSales())
            .satSales(info.satSales())
            .sunSales(info.sunSales())
            .build();
    }

    private CommercialAgeSalesItem toAgeSalesItem(CommercialAgeSalesInfo info) {
        return CommercialAgeSalesItem.builder()
            .teenSales(info.teenSales())
            .twentySales(info.twentySales())
            .thirtySales(info.thirtySales())
            .fortySales(info.fortySales())
            .fiftySales(info.fiftySales())
            .sixtySales(info.sixtySales())
            .build();
    }

    private CommercialAgeGenderPercentSalesItem toAgeGenderPercentSalesItem(CommercialAgeGenderPercentSalesInfo info) {
        return CommercialAgeGenderPercentSalesItem.builder()
            .maleTeenSalesPercent(info.maleTeenSalesPercent())
            .femaleTeenSalesPercent(info.femaleTeenSalesPercent())
            .maleTwentySalesPercent(info.maleTwentySalesPercent())
            .femaleTwentySalesPercent(info.femaleTwentySalesPercent())
            .maleThirtySalesPercent(info.maleThirtySalesPercent())
            .femaleThirtySalesPercent(info.femaleThirtySalesPercent())
            .maleFortySalesPercent(info.maleFortySalesPercent())
            .femaleFortySalesPercent(info.femaleFortySalesPercent())
            .maleFiftySalesPercent(info.maleFiftySalesPercent())
            .femaleFiftySalesPercent(info.femaleFiftySalesPercent())
            .maleSixtySalesPercent(info.maleSixtySalesPercent())
            .femaleSixtySalesPercent(info.femaleSixtySalesPercent())
            .build();
    }

    private CommercialDaySalesCountItem toDaySalesCountItem(CommercialDaySalesCountInfo info) {
        return CommercialDaySalesCountItem.builder()
            .monSalesCount(info.monSalesCount())
            .tueSalesCount(info.tueSalesCount())
            .wedSalesCount(info.wedSalesCount())
            .thuSalesCount(info.thuSalesCount())
            .friSalesCount(info.friSalesCount())
            .satSalesCount(info.satSalesCount())
            .sunSalesCount(info.sunSalesCount())
            .build();
    }

    private CommercialTimeSalesCountItem toTimeSalesCountItem(CommercialTimeSalesCountInfo info) {
        return CommercialTimeSalesCountItem.builder()
            .salesCount00(info.salesCount00())
            .salesCount06(info.salesCount06())
            .salesCount11(info.salesCount11())
            .salesCount14(info.salesCount14())
            .salesCount17(info.salesCount17())
            .salesCount21(info.salesCount21())
            .build();
    }

    private CommercialGenderSalesCountItem toGenderSalesCountItem(CommercialGenderSalesCountInfo info) {
        return CommercialGenderSalesCountItem.builder()
            .maleSalesCount(info.maleSalesCount())
            .femaleSalesCount(info.femaleSalesCount())
            .build();
    }

    private CommercialSchoolCountItem toSchoolCountItem(CommercialSchoolCountInfo info) {
        return CommercialSchoolCountItem.builder()
            .elementarySchoolCount(info.elementarySchoolCount())
            .middleSchoolCount(info.middleSchoolCount())
            .highSchoolCount(info.highSchoolCount())
            .universityCount(info.universityCount())
            .totalSchoolCount(info.totalSchoolCount())
            .build();
    }
}
