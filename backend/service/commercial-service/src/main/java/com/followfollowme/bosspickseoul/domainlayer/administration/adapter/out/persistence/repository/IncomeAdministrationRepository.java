package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IncomeAdministrationRepository extends JpaRepository<IncomeAdministrationEntity, Long> {

    Optional<IncomeAdministrationEntity> findByPeriodCodeAndAdministrationCodeAndSpatialVersion(
        String periodCode, String administrationCode, String spatialVersion);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from IncomeAdministrationEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
