package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictServiceTopFiveQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import java.util.List;
import java.util.Optional;

public interface SalesDistrictRepositoryPort {

    Optional<SalesDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<SalesDistrictTopTenQueryResult> findTopTenBySales(String currentPeriodCode, String previousPeriodCode);

    List<SalesDistrictServiceTopFiveQueryResult> findTopFiveServiceBySales(
        String districtCode, String currentPeriodCode, String previousPeriodCode);
}
