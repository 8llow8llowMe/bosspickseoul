package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.ChangeDistrictEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeDistrictRepository extends JpaRepository<ChangeDistrictEntity, Long> {

    Optional<ChangeDistrictEntity> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);
}
