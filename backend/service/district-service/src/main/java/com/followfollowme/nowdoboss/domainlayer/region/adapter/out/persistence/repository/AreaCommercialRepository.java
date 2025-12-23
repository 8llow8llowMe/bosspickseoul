package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaCommercialRepository extends JpaRepository<AreaCommercial, Long> {

    List<AreaCommercialEntity> findAllByDistrictCode(String districtCode);

    List<AreaCommercialEntity> findAllByAdministrationCode(String administrationCode);
}
