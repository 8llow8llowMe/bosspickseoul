package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialAdministrationProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaCommercialRepository extends JpaRepository<AreaCommercialEntity, Long> {

    List<AreaCommercialEntity> findAllByDistrictCode(String districtCode);

    List<AreaCommercialEntity> findAllByAdministrationCode(String administrationCode);

    Optional<DistrictNameProjection> findDistinctByDistrictName(String districtName);

    Optional<AdministrationNameProjection> findDistinctByAdministrationName(String administrationName);

    Optional<CommercialNameProjection> findDistinctByCommercialName(String commercialName);

    Optional<AreaCommercialEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialAdministrationProjection> findFirstByCommercialCode(String commercialCode);
}
