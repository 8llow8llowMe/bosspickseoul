package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.FootTrafficCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FootTrafficCommercialRepository extends JpaRepository<FootTrafficCommercialEntity, Long> {

    Optional<FootTrafficCommercialEntity> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<FootTrafficCommercialEntity> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes);
}
