package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommercialRegionReferenceEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommercialRegionReferenceRepository extends JpaRepository<CommercialRegionReferenceEntity, Long> {

    Optional<CommercialRegionReferenceEntity> findFirstByDistrictCode(String districtCode);

    Optional<CommercialRegionReferenceEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialRegionReferenceEntity> findFirstByCommercialCode(String commercialCode);
}
