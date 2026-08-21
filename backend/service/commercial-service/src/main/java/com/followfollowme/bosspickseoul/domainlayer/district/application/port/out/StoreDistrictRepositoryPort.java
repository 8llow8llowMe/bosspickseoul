package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictServiceTopEightQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import java.util.List;
import java.util.Optional;

public interface StoreDistrictRepositoryPort {

    Optional<StoreDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<StoreDistrictOpenedTopTenQueryResult> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictClosedTopTenQueryResult> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictServiceTopEightQueryResult> findTopEightByTotalStore(String periodCode, String districtCode);
}
