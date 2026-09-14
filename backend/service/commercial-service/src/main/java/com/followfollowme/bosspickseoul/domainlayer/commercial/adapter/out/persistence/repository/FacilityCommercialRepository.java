package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.FacilityCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityCommercialRepository extends JpaRepository<FacilityCommercialEntity, Long> {

    Optional<FacilityCommercialEntity> findByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<FacilityCommercialEntity> findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String spatialVersion, List<String> commercialCodes);
}
