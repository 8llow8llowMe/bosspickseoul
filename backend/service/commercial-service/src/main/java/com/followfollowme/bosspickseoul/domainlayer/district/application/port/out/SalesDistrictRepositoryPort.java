package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictServiceTopFiveQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import java.util.List;
import java.util.Optional;

public interface SalesDistrictRepositoryPort {

    Optional<SalesDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<SalesDistrictTopTenQueryResult> findTopTenBySales(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체. 매출 합계 내림차순, 같으면 자치구 코드 오름차순이다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<SalesDistrictRankingQueryResult> findRankingsBySales(String currentPeriodCode, String previousPeriodCode);

    List<SalesDistrictServiceTopFiveQueryResult> findTopFiveServiceBySales(
        String districtCode, String currentPeriodCode, String previousPeriodCode);
}
