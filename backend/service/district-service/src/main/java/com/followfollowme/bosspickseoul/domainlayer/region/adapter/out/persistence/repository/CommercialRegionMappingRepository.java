package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialAdministrationProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommercialRegionMappingRepository extends JpaRepository<CommercialRegionMappingEntity, Long> {

    List<CommercialRegionMappingEntity> findAllByDistrictCode(String districtCode);

    List<CommercialRegionMappingEntity> findAllByAdministrationCode(String administrationCode);

    // DISTINCT 는 투영이 SELECT 한 컬럼 조합에만 걸린다. 접두어를 빼면 findByDistrictName("종로구") 이 같은 자치구의
    // 상권 수십 행을 그대로 돌려주므로 유지한다. 다만 자치구가 다른 동명 행정동/상권은 접히지 않아 다건이 나올 수 있다.
    List<DistrictNameProjection> findDistinctByDistrictName(String districtName);

    List<AdministrationNameProjection> findDistinctByAdministrationName(String administrationName);

    List<CommercialNameProjection> findDistinctByCommercialName(String commercialName);

    Optional<CommercialRegionMappingEntity> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialAdministrationProjection> findFirstByCommercialCode(String commercialCode);

    Optional<DistrictNameProjection> findFirstByDistrictCode(String districtCode);
}
