package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreCommercialRepository extends JpaRepository<StoreCommercialEntity, Long> {

    Optional<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode);

    List<StoreCommercialEntity> findByPeriodCodeAndCommercialCodeAndServiceType(
        String periodCode, String commercialCode, ServiceType serviceType);

    List<StoreCommercialEntity> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
        String commercialCode, String serviceCode, List<String> periodCodes);

    List<StoreCommercialEntity> findAllByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
