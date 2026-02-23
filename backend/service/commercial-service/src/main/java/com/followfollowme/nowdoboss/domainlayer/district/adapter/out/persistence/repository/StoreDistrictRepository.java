package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom.StoreDistrictCustomRepository;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreDistrictRepository extends JpaRepository<StoreDistrictEntity, Long>, StoreDistrictCustomRepository {

    Optional<StoreDistrictEntity> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);
}
