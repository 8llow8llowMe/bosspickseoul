package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialAdministrationProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommercialRegionMappingRepository extends JpaRepository<CommercialRegionMappingEntity, Long> {

    List<CommercialRegionMappingEntity> findAllByDistrictCode(String districtCode);

    List<CommercialRegionMappingEntity> findAllByAdministrationCode(String administrationCode);

    Optional<DistrictNameProjection> findDistinctByDistrictName(String districtName);

    Optional<AdministrationNameProjection> findDistinctByAdministrationName(String administrationName);

    Optional<CommercialNameProjection> findDistinctByCommercialName(String commercialName);

    Optional<CommercialRegionMappingEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialAdministrationProjection> findFirstByCommercialCode(String commercialCode);

    Optional<DistrictNameProjection> findFirstByDistrictCode(String districtCode);
}
