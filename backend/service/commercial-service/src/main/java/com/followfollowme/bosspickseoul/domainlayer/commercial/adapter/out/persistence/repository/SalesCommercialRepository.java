package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.SalesCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SalesCommercialRepository extends JpaRepository<SalesCommercialEntity, Long> {

    @Query("""
            select distinct sc.serviceCode
            from SalesCommercialEntity sc
            where sc.commercialCode = :commercialCode
              and sc.spatialVersion = :spatialVersion
        """)
    List<String> findDistinctServiceCodesByCommercialCode(String commercialCode, String spatialVersion);

    Optional<SalesCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(
        String periodCode, String commercialCode, String serviceCode, String spatialVersion);

    List<SalesCommercialEntity> findByCommercialCodeAndServiceCodeAndSpatialVersionAndPeriodCodeIn(
        String commercialCode, String serviceCode, String spatialVersion, List<String> periodCodes);

    List<SalesCommercialEntity> findAllByPeriodCodeAndServiceCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String serviceCode, String spatialVersion, List<String> commercialCodes);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from SalesCommercialEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
