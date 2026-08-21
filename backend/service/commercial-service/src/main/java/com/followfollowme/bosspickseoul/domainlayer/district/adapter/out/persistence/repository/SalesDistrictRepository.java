package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom.SalesDistrictCustomRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesDistrictRepository extends JpaRepository<SalesDistrictEntity, Long>, SalesDistrictCustomRepository {

    Optional<SalesDistrictEntity> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode,
        String districtCode,
        String serviceCode
    );

    List<SalesDistrictEntity> findAllByPeriodCodeInAndDistrictCodeAndServiceCode(
        List<String> periodCodes,
        String districtCode,
        String serviceCode
    );
}
