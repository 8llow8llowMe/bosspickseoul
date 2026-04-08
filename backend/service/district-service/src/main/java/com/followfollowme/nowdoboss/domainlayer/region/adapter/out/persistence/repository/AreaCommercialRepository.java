package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.AdministrationCodeProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialAdministrationProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialCodeProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.DistrictCodeProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaCommercialRepository extends JpaRepository<AreaCommercialEntity, Long> {

    List<AreaCommercialEntity> findAllByDistrictCode(String districtCode);

    List<AreaCommercialEntity> findAllByAdministrationCode(String administrationCode);

    Optional<DistrictCodeProjection> findDistinctByDistrictCodeName(String districtCodeName);

    Optional<AdministrationCodeProjection> findDistinctByAdministrationCodeName(String administrationCodeName);

    Optional<CommercialCodeProjection> findDistinctByCommercialCodeName(String commercialCodeName);

    Optional<AreaCommercialEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialAdministrationProjection> findFirstByCommercialCode(String commercialCode);
}
