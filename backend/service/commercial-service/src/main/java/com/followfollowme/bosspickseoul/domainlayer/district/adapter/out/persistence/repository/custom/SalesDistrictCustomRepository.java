package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictServiceTopFiveProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
import java.util.List;

public interface SalesDistrictCustomRepository {

    List<SalesDistrictTopTenProjection> findTopTenBySales(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체를 매출 합계 내림차순, 같으면 자치구 코드 오름차순으로 돌려준다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<SalesDistrictRankingProjection> findRankingsBySales(String currentPeriodCode, String previousPeriodCode);

    List<SalesDistrictServiceTopFiveProjection> findTopFiveServiceBySales(
        String districtCode, String currentPeriodCode, String previousPeriodCode);
}
