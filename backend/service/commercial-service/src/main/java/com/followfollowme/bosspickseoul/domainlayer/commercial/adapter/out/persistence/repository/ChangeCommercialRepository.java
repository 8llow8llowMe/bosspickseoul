package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.ChangeCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChangeCommercialRepository extends JpaRepository<ChangeCommercialEntity, Long> {

    Optional<ChangeCommercialEntity> findByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<ChangeCommercialEntity> findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String spatialVersion, List<String> commercialCodes);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from ChangeCommercialEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
