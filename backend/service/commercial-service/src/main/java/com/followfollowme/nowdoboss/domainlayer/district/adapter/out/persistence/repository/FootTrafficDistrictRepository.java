package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.FootTrafficDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom.FootTrafficDistrictCustomRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FootTrafficDistrictRepository extends JpaRepository<FootTrafficDistrictEntity, Long>, FootTrafficDistrictCustomRepository {

    Optional<FootTrafficDistrictEntity> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);

    List<FootTrafficDistrictEntity> findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(List<String> periodCodes, String districtCode);
}
