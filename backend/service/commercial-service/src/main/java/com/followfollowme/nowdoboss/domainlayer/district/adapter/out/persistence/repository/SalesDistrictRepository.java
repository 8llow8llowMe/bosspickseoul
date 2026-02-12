package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom.SalesDistrictCustomRepository;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesDistrictRepository extends JpaRepository<SalesDistrictEntity, Long>, SalesDistrictCustomRepository {

    Optional<SalesDistrictEntity> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);
}
