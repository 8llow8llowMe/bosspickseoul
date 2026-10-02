package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.FootTrafficDistrict;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictTopTenQueryResult;
import java.util.List;
import java.util.Optional;

public interface FootTrafficDistrictRepositoryPort {

    Optional<FootTrafficDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);

    List<FootTrafficDistrict> findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(List<String> periodCodes, String districtCode);

    List<DistrictAreaQueryResult> findDistrictAreasByPeriodCode(String periodCode);

    List<FootTrafficDistrictTopTenQueryResult> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체. 유동인구 내림차순, 같으면 자치구 코드 오름차순이다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<FootTrafficDistrictRankingQueryResult> findRankingsByFootTraffic(String currentPeriodCode, String previousPeriodCode);
}
