package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictServiceTopEightQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import java.util.List;
import java.util.Optional;

public interface StoreDistrictRepositoryPort {

    Optional<StoreDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<StoreDistrictOpenedTopTenQueryResult> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictClosedTopTenQueryResult> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체. 개업 점포 수 합계 내림차순, 같으면 자치구 코드 오름차순이다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<StoreDistrictOpenedRankingQueryResult> findRankingsByOpenedStore(String currentPeriodCode, String previousPeriodCode);

    /** 현재 분기 행이 있는 자치구 전체. 폐업 점포 수 합계 내림차순, 같으면 자치구 코드 오름차순이다. 직전 분기 행이 없어도 빠지지 않는다. */
    List<StoreDistrictClosedRankingQueryResult> findRankingsByClosedStore(String currentPeriodCode, String previousPeriodCode);

    List<StoreDistrictServiceTopEightQueryResult> findTopEightByTotalStore(String periodCode, String districtCode);
}
