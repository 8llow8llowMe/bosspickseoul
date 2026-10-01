package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom.SalesDistrictCustomRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SalesDistrictRepository extends JpaRepository<SalesDistrictEntity, Long>, SalesDistrictCustomRepository {

    Optional<SalesDistrictEntity> findByPeriodCodeAndDistrictCodeAndServiceCodeAndSpatialVersion(
        String periodCode,
        String districtCode,
        String serviceCode,
        String spatialVersion
    );

    List<SalesDistrictEntity> findAllByPeriodCodeInAndDistrictCodeAndServiceCodeAndSpatialVersion(
        List<String> periodCodes,
        String districtCode,
        String serviceCode,
        String spatialVersion
    );

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from SalesDistrictEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
