package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGenderPercentFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGroupFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDayOfWeekFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSlotFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeGenderPercentFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialAgeGroupFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialDayOfWeekFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialServiceCategoryInfo;
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
            .timeSlotFootTraffic(toTimeSlotFootTrafficItem(info.timeSlotFootTraffic()))
            .dayOfWeekFootTraffic(toDayOfWeekFootTrafficItem(info.dayOfWeekFootTraffic()))
            .ageGroupFootTraffic(toAgeGroupFootTrafficItem(info.ageGroupFootTraffic()))
            .ageGenderPercentFootTraffic(toAgeGenderPercentFootTrafficItem(info.ageGenderPercentFootTraffic()))
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
}
