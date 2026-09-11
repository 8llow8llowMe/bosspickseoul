package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.FootTrafficCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FootTrafficCommercialRepository extends JpaRepository<FootTrafficCommercialEntity, Long> {

    Optional<FootTrafficCommercialEntity> findByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<FootTrafficCommercialEntity> findByCommercialCodeAndSpatialVersionAndPeriodCodeIn(
        String commercialCode, String spatialVersion, List<String> periodCodes);
}
