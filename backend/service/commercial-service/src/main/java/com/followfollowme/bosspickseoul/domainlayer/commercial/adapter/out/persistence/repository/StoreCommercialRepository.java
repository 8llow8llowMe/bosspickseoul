package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StoreCommercialRepository extends JpaRepository<StoreCommercialEntity, Long> {

    Optional<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(
        String periodCode, String commercialCode, String serviceCode, String spatialVersion);

    List<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceTypeAndSpatialVersion(
        String periodCode, String commercialCode, ServiceType serviceType, String spatialVersion);

    List<StoreCommercialEntity> findByCommercialCodeAndServiceCodeAndSpatialVersionAndPeriodCodeIn(
        String commercialCode, String serviceCode, String spatialVersion, List<String> periodCodes);

    List<StoreCommercialEntity> findAllByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<StoreCommercialEntity> findAllByPeriodCodeAndServiceCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String serviceCode, String spatialVersion, List<String> commercialCodes);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from StoreCommercialEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
