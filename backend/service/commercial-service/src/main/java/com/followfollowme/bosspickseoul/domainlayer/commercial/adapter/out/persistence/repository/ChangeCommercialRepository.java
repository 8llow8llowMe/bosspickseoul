package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.ChangeCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeCommercialRepository extends JpaRepository<ChangeCommercialEntity, Long> {

    Optional<ChangeCommercialEntity> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<ChangeCommercialEntity> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes);
}
