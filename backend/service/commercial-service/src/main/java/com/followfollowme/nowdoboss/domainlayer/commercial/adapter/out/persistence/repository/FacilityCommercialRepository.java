package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.FacilityCommercialEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityCommercialRepository extends JpaRepository<FacilityCommercialEntity, Long> {

    Optional<FacilityCommercialEntity> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
