package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictAgeGroupFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreAdministrationTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictDayOfWeekFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictFootTrafficTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictGenderFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreAdministrationTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictPeriodFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesAdministrationTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesServiceTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictStoreServiceTopItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictTimeSlotFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesAdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictAgeGroupFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.area.DistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictClosedStoreAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictDayOfWeekFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictGenderFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictOpenedStoreAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictPeriodFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictTimeSlotFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DistrictPresenter {

    public DistrictTopTenSummaryResponse toDistrictTopTenSummaryResponse(DistrictTopTenSummaryInfo info) {
        return DistrictTopTenSummaryResponse.builder()
            .footTrafficTopTenItems(toFootTrafficTopTenItems(info.footTrafficTopTenInfos()))
            .salesTopTenItems(toSalesTopTenItems(info.salesTopTenInfos()))
            .openedStoreTopTenItems(toOpenedStoreTopTenItems(info.openedStoreTopTenInfos()))
            .closedStoreTopTenItems(toClosedStoreTopTenItems(info.closedStoreTopTenInfos()))
            .build();
    }

    public DistrictDetailResponse toDistrictDetailResponse(DistrictDetailInfo info) {
        return DistrictDetailResponse.builder()
            .changeIndicator(toChangeIndicatorDistrictResponse(info.changeIndicator()))
            .footTraffic(toFootTrafficDistrictDetailResponse(info.footTraffic()))
            .store(toDistrictStoreDetailResponse(info.store()))
            .sales(toDistrictSalesDetailResponse(info.sales()))
            .build();
    }

    public ChangeIndicatorDistrictResponse toChangeIndicatorDistrictResponse(DistrictChangeIndicatorInfo info) {
        return ChangeIndicatorDistrictResponse.builder()
            .changeIndicatorCode(info.changeIndicatorCode())
            .changeIndicatorName(info.changeIndicatorName())
            .averageOpenedMonths(info.averageOpenedMonths())
            .averageClosedMonths(info.averageClosedMonths())
            .build();
    }

    public FootTrafficDistrictDetailResponse toFootTrafficDistrictDetailResponse(DistrictFootTrafficDetailInfo info) {
        return FootTrafficDistrictDetailResponse.builder()
            .periodTrend(info.periodTrend())
            .periodTotalFootTrafficList(toDistrictPeriodFootTrafficItems(info.periodTotalFootTrafficList()))
            .timeSlot(toDistrictTimeSlotFootTrafficItem(info.timeSlot()))
            .gender(toDistrictGenderFootTrafficItem(info.gender()))
            .ageGroup(toDistrictAgeGroupFootTrafficItem(info.ageGroup()))
            .dayOfWeek(toDistrictDayOfWeekFootTrafficItem(info.dayOfWeek()))
            .build();
    }

    public DistrictStoreDetailResponse toDistrictStoreDetailResponse(DistrictStoreDetailInfo info) {
        return DistrictStoreDetailResponse.builder()
            .topStoreServices(toDistrictStoreServiceTopItems(info.topStoreServices()))
            .topOpenedAdministrations(toDistrictOpenedStoreAdministrationTopItems(info.topOpenedAdministrations()))
            .topClosedAdministrations(toDistrictClosedStoreAdministrationTopItems(info.topClosedAdministrations()))
            .build();
    }

    public DistrictSalesDetailResponse toDistrictSalesDetailResponse(DistrictSalesDetailInfo info) {
        return DistrictSalesDetailResponse.builder()
            .topSalesServices(toDistrictSalesServiceTopItems(info.topSalesServices()))
            .topSalesAdministrations(toDistrictSalesAdministrationTopItems(info.topSalesAdministrations()))
            .build();
    }

    public DistrictSalesAdministrationDetailResponse toDistrictSalesAdministrationDetailResponse(
        List<DistrictSalesAdministrationTopInfo> infos
    ) {
        return DistrictSalesAdministrationDetailResponse.builder()
            .topSalesAdministrations(toDistrictSalesAdministrationTopItems(infos))
            .build();
    }

    public List<DistrictAreaResponse> toDistrictAreaResponses(List<DistrictAreaInfo> infos) {
        return infos.stream()
            .map(this::toDistrictAreaResponse)
            .toList();
    }

    private DistrictAreaResponse toDistrictAreaResponse(DistrictAreaInfo info) {
        return DistrictAreaResponse.builder()
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .build();
    }

    private List<DistrictPeriodFootTrafficItem> toDistrictPeriodFootTrafficItems(List<DistrictPeriodFootTrafficInfo> infos) {
        return infos.stream()
            .map(this::toDistrictPeriodFootTrafficItem)
            .toList();
    }

    private DistrictPeriodFootTrafficItem toDistrictPeriodFootTrafficItem(DistrictPeriodFootTrafficInfo info) {
        return DistrictPeriodFootTrafficItem.builder()
            .periodCode(info.periodCode())
            .totalFootTraffic(info.totalFootTraffic())
            .build();
    }

    private DistrictTimeSlotFootTrafficItem toDistrictTimeSlotFootTrafficItem(DistrictTimeSlotFootTrafficInfo info) {
        return DistrictTimeSlotFootTrafficItem.builder()
            .footTrafficTime00To06(info.footTrafficTime00To06())
            .footTrafficTime06To11(info.footTrafficTime06To11())
            .footTrafficTime11To14(info.footTrafficTime11To14())
            .footTrafficTime14To17(info.footTrafficTime14To17())
            .footTrafficTime17To21(info.footTrafficTime17To21())
            .footTrafficTime21To24(info.footTrafficTime21To24())
            .dominantTimeSlotType(info.dominantTimeSlotType())
            .build();
    }

    private DistrictGenderFootTrafficItem toDistrictGenderFootTrafficItem(DistrictGenderFootTrafficInfo info) {
        return DistrictGenderFootTrafficItem.builder()
            .maleFootTraffic(info.maleFootTraffic())
            .femaleFootTraffic(info.femaleFootTraffic())
            .dominantGenderType(info.dominantGenderType())
            .build();
    }

    private DistrictAgeGroupFootTrafficItem toDistrictAgeGroupFootTrafficItem(DistrictAgeGroupFootTrafficInfo info) {
        return DistrictAgeGroupFootTrafficItem.builder()
            .age10FootTraffic(info.age10FootTraffic())
            .age20FootTraffic(info.age20FootTraffic())
            .age30FootTraffic(info.age30FootTraffic())
            .age40FootTraffic(info.age40FootTraffic())
            .age50FootTraffic(info.age50FootTraffic())
            .age60PlusFootTraffic(info.age60PlusFootTraffic())
            .dominantAgeGroupType(info.dominantAgeGroupType())
            .build();
    }

    private DistrictDayOfWeekFootTrafficItem toDistrictDayOfWeekFootTrafficItem(DistrictDayOfWeekFootTrafficInfo info) {
        return DistrictDayOfWeekFootTrafficItem.builder()
            .mondayFootTraffic(info.mondayFootTraffic())
            .tuesdayFootTraffic(info.tuesdayFootTraffic())
            .wednesdayFootTraffic(info.wednesdayFootTraffic())
            .thursdayFootTraffic(info.thursdayFootTraffic())
            .fridayFootTraffic(info.fridayFootTraffic())
            .saturdayFootTraffic(info.saturdayFootTraffic())
            .sundayFootTraffic(info.sundayFootTraffic())
            .dominantDayOfWeekType(info.dominantDayOfWeekType())
            .build();
    }

    private List<DistrictStoreServiceTopItem> toDistrictStoreServiceTopItems(List<DistrictStoreServiceTopInfo> infos) {
        return infos.stream()
            .map(this::toDistrictStoreServiceTopItem)
            .toList();
    }

    private DistrictStoreServiceTopItem toDistrictStoreServiceTopItem(DistrictStoreServiceTopInfo info) {
        return DistrictStoreServiceTopItem.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .totalStoreCount(info.totalStoreCount())
            .build();
    }

    private List<DistrictOpenedStoreAdministrationTopItem> toDistrictOpenedStoreAdministrationTopItems(
        List<DistrictOpenedStoreAdministrationTopInfo> infos
    ) {
        return infos.stream()
            .map(this::toDistrictOpenedStoreAdministrationTopItem)
            .toList();
    }

    private DistrictOpenedStoreAdministrationTopItem toDistrictOpenedStoreAdministrationTopItem(
        DistrictOpenedStoreAdministrationTopInfo info
    ) {
        return DistrictOpenedStoreAdministrationTopItem.builder()
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .openedStoreCount(info.openedStoreCount())
            .openingRate(info.openingRate())
            .build();
    }

    private List<DistrictClosedStoreAdministrationTopItem> toDistrictClosedStoreAdministrationTopItems(
        List<DistrictClosedStoreAdministrationTopInfo> infos
    ) {
        return infos.stream()
            .map(this::toDistrictClosedStoreAdministrationTopItem)
            .toList();
    }

    private DistrictClosedStoreAdministrationTopItem toDistrictClosedStoreAdministrationTopItem(
        DistrictClosedStoreAdministrationTopInfo info
    ) {
        return DistrictClosedStoreAdministrationTopItem.builder()
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .closedStoreCount(info.closedStoreCount())
            .closureRate(info.closureRate())
            .build();
    }

    private List<DistrictSalesServiceTopItem> toDistrictSalesServiceTopItems(List<DistrictSalesServiceTopInfo> infos) {
        return infos.stream()
            .map(this::toDistrictSalesServiceTopItem)
            .toList();
    }

    private List<DistrictSalesAdministrationTopItem> toDistrictSalesAdministrationTopItems(
        List<DistrictSalesAdministrationTopInfo> infos
    ) {
        return infos.stream()
            .map(this::toDistrictSalesAdministrationTopItem)
            .toList();
    }

    private DistrictSalesServiceTopItem toDistrictSalesServiceTopItem(DistrictSalesServiceTopInfo info) {
        return DistrictSalesServiceTopItem.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .salesChangeRate(info.salesChangeRate())
            .build();
    }

    private DistrictSalesAdministrationTopItem toDistrictSalesAdministrationTopItem(DistrictSalesAdministrationTopInfo info) {
        return DistrictSalesAdministrationTopItem.builder()
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .totalSalesAmount(info.totalSalesAmount())
            .salesChangeRate(info.salesChangeRate())
            .build();
    }

    private List<DistrictFootTrafficTopTenItem> toFootTrafficTopTenItems(List<DistrictFootTrafficTopTenInfo> infos) {
        return infos.stream()
            .map(this::toFootTrafficTopTenItem)
            .toList();
    }

    private DistrictFootTrafficTopTenItem toFootTrafficTopTenItem(DistrictFootTrafficTopTenInfo info) {
        return DistrictFootTrafficTopTenItem.builder()
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .totalFootTraffic(info.totalFootTraffic())
            .footTrafficChangeRate(info.footTrafficChangeRate())
            .build();
    }

    private List<DistrictSalesTopTenItem> toSalesTopTenItems(List<DistrictSalesTopTenInfo> infos) {
        return infos.stream()
            .map(this::toSalesTopTenItem)
            .toList();
    }

    private DistrictSalesTopTenItem toSalesTopTenItem(DistrictSalesTopTenInfo info) {
        return DistrictSalesTopTenItem.builder()
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .totalSalesAmount(info.totalSalesAmount())
            .salesChangeRate(info.salesChangeRate())
            .build();
    }

    private List<DistrictOpenedStoreTopTenItem> toOpenedStoreTopTenItems(List<DistrictOpenedStoreTopTenInfo> infos) {
        return infos.stream()
            .map(this::toOpenedStoreTopTenItem)
            .toList();
    }

    private DistrictOpenedStoreTopTenItem toOpenedStoreTopTenItem(DistrictOpenedStoreTopTenInfo info) {
        return DistrictOpenedStoreTopTenItem.builder()
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .openedStoreCount(info.openedStoreCount())
            .openingChangeRate(info.openingChangeRate())
            .build();
    }

    private List<DistrictClosedStoreTopTenItem> toClosedStoreTopTenItems(List<DistrictClosedStoreTopTenInfo> infos) {
        return infos.stream()
            .map(this::toClosedStoreTopTenItem)
            .toList();
    }

    private DistrictClosedStoreTopTenItem toClosedStoreTopTenItem(DistrictClosedStoreTopTenInfo info) {
        return DistrictClosedStoreTopTenItem.builder()
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .closedStoreCount(info.closedStoreCount())
            .closureChangeRate(info.closureChangeRate())
            .build();
    }
}

