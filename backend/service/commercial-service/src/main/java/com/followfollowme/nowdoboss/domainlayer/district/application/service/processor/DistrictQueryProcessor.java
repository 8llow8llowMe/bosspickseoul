package com.followfollowme.nowdoboss.domainlayer.district.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictTopTenSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.SalesDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DistrictQueryProcessor {

    private final FootTrafficDistrictRepositoryPort footTrafficDistrictRepositoryPort;
    private final SalesDistrictRepositoryPort salesDistrictRepositoryPort;
    private final StoreDistrictRepositoryPort storeDistrictRepositoryPort;

    public DistrictTopTenSummaryInfo getTopTenSummary(String currentPeriodCode, String previousPeriodCode) {
        // 유동인구 Top 10
        List<DistrictFootTrafficTopTenInfo> footTrafficTopTenInfos = footTrafficDistrictRepositoryPort
            .findTopTenByFootTraffic(currentPeriodCode, previousPeriodCode);

        // 매출 Top 10
        List<DistrictSalesTopTenInfo> salesTopTenInfos = salesDistrictRepositoryPort
            .findTopTenBySales(currentPeriodCode, previousPeriodCode);

        // 개업 점포 Top 10
        List<DistrictOpenedStoreTopTenInfo> openedStoreTopTenInfos = storeDistrictRepositoryPort
            .findTopTenByOpenedStore(currentPeriodCode, previousPeriodCode);

        // 폐업 점포 Top 10
        List<DistrictClosedStoreTopTenInfo> closedStoreTopTenInfos = storeDistrictRepositoryPort
            .findTopTenByClosedStore(currentPeriodCode, previousPeriodCode);

        return DistrictTopTenSummaryInfo.builder()
            .footTrafficTopTenInfos(footTrafficTopTenInfos)
            .salesTopTenInfos(salesTopTenInfos)
            .openedStoreTopTenInfos(openedStoreTopTenInfos)
            .closedStoreTopTenInfos(closedStoreTopTenInfos)
            .build();
    }
}
