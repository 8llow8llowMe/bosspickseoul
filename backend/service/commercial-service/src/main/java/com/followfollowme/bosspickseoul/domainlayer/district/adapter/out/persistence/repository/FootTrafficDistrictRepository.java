package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.FootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom.FootTrafficDistrictCustomRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FootTrafficDistrictRepository extends JpaRepository<FootTrafficDistrictEntity, Long>, FootTrafficDistrictCustomRepository {

    Optional<FootTrafficDistrictEntity> findByPeriodCodeAndDistrictCodeAndSpatialVersion(
        String periodCode, String districtCode, String spatialVersion);

    List<FootTrafficDistrictEntity> findByPeriodCodeInAndDistrictCodeAndSpatialVersionOrderByPeriodCode(
        List<String> periodCodes, String districtCode, String spatialVersion);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from FootTrafficDistrictEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
