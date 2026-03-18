package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.AreaCommercialReferenceEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaCommercialReferenceRepository extends JpaRepository<AreaCommercialReferenceEntity, Long> {

    Optional<AreaCommercialReferenceEntity> findFirstByDistrictCode(String districtCode);

    Optional<AreaCommercialReferenceEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<AreaCommercialReferenceEntity> findFirstByCommercialCode(String commercialCode);
}
