package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreCommercialRepository extends JpaRepository<StoreCommercialEntity, Long> {

    Optional<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(
        String periodCode, String commercialCode, String serviceCode, String spatialVersion);

    List<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceTypeAndSpatialVersion(
        String periodCode, String commercialCode, ServiceType serviceType, String spatialVersion);

    List<StoreCommercialEntity> findByCommercialCodeAndServiceCodeAndSpatialVersionAndPeriodCodeIn(
        String commercialCode, String serviceCode, String spatialVersion, List<String> periodCodes);

    List<StoreCommercialEntity> findAllByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);
}
