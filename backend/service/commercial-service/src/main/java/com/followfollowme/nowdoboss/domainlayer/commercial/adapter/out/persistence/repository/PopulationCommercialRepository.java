package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.PopulationCommercialEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PopulationCommercialRepository extends JpaRepository<PopulationCommercialEntity, Long> {

    Optional<PopulationCommercialEntity> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
