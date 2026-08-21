package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.IncomeCommercialEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeCommercialRepository extends JpaRepository<IncomeCommercialEntity, Long> {

    Optional<IncomeCommercialEntity> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
