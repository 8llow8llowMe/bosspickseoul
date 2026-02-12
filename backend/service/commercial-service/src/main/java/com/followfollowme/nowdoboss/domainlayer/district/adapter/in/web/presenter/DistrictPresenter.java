package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictClosedStoreTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictFootTrafficTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictOpenedStoreTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictSalesTopTenItem;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictTopTenSummaryInfo;
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
