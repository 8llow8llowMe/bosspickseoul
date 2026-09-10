package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.ChangeCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeCommercialRepository extends JpaRepository<ChangeCommercialEntity, Long> {

    Optional<ChangeCommercialEntity> findByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<ChangeCommercialEntity> findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String spatialVersion, List<String> commercialCodes);
}
