package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import java.util.List;

public interface FootTrafficDistrictCustomRepository {

    List<FootTrafficDistrictTopTenProjection> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체를 유동인구 내림차순, 같으면 자치구 코드 오름차순으로 돌려준다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<FootTrafficDistrictRankingProjection> findRankingsByFootTraffic(String currentPeriodCode, String previousPeriodCode);

    List<DistrictAreaProjection> findDistrictAreasByPeriodCode(String periodCode);
}
