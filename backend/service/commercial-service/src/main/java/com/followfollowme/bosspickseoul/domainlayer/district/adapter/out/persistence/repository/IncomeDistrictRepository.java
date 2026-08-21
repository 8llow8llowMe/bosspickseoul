package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.IncomeDistrictEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeDistrictRepository extends JpaRepository<IncomeDistrictEntity, Long> {

    Optional<IncomeDistrictEntity> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);
}
