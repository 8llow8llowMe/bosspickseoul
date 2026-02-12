package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import java.util.List;

public interface FootTrafficDistrictCustomRepository {

    List<FootTrafficDistrictTopTenProjection> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode);
}
