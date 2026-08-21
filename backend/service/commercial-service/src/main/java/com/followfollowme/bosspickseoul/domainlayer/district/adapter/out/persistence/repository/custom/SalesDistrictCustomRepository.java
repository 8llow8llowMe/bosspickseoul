package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictServiceTopFiveProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
import java.util.List;

public interface SalesDistrictCustomRepository {

    List<SalesDistrictTopTenProjection> findTopTenBySales(String currentPeriodCode, String previousPeriodCode);

    List<SalesDistrictServiceTopFiveProjection> findTopFiveServiceBySales(
        String districtCode, String currentPeriodCode, String previousPeriodCode);
}
