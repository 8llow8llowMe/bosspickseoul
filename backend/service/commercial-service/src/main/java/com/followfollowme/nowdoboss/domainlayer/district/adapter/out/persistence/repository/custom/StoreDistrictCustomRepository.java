package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import java.util.List;

public interface StoreDistrictCustomRepository {

    List<StoreDistrictOpenedTopTenProjection> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictClosedTopTenProjection> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode);
}
