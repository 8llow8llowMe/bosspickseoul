package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictServiceTopEightProjection;
import java.util.List;

public interface StoreDistrictCustomRepository {

    List<StoreDistrictOpenedTopTenProjection> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictClosedTopTenProjection> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체를 개업 점포 수 합계 내림차순, 같으면 자치구 코드 오름차순으로 돌려준다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<StoreDistrictOpenedRankingProjection> findRankingsByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체를 폐업 점포 수 합계 내림차순, 같으면 자치구 코드 오름차순으로 돌려준다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<StoreDistrictClosedRankingProjection> findRankingsByClosedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictServiceTopEightProjection> findTopEightByTotalStore(String periodCode, String districtCode);
}
