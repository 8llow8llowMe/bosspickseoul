package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StoreAdministrationRepository extends JpaRepository<StoreAdministrationEntity, Long> {

    List<StoreAdministrationEntity> findAllByPeriodCodeAndAdministrationCodeAndSpatialVersion(
        String periodCode, String administrationCode, String spatialVersion);

    /**
     * 상권 벤치마크의 점포당 매출 지수가 행정동 한 업종의 점포 수를 읽을 때 쓴다(이슈 #485). 네 조건이 유니크 키
     * {@code uk_store_admin_period_admin_svc_spatial} 와 같아 많아야 한 행이다.
     */
    Optional<StoreAdministrationEntity> findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
        String periodCode, String administrationCode, String serviceCode, String spatialVersion);

    /** 분석 기준 분기 카탈로그(analysisperiod)가 적재 분기를 모을 때 쓴다. 공간 스냅샷은 호출자가 명시한다. */
    @Query("select distinct e.periodCode from StoreAdministrationEntity e where e.spatialVersion = :spatialVersion")
    List<String> findDistinctPeriodCodesBySpatialVersion(String spatialVersion);
}
