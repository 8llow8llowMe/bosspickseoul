package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.StoreDistrict;
import java.util.List;
import java.util.Optional;

public interface StoreDistrictRepositoryPort {

    Optional<StoreDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<DistrictOpenedStoreTopTenInfo> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    List<DistrictClosedStoreTopTenInfo> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode);
}
