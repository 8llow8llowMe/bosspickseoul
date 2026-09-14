package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.IncomeCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeCommercialRepository extends JpaRepository<IncomeCommercialEntity, Long> {

    Optional<IncomeCommercialEntity> findByPeriodCodeAndCommercialCodeAndSpatialVersion(
        String periodCode, String commercialCode, String spatialVersion);

    List<IncomeCommercialEntity> findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
        String periodCode, String spatialVersion, List<String> commercialCodes);
}
