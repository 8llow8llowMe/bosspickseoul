package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesAdministrationRepository extends JpaRepository<SalesAdministrationEntity, Long> {

    List<SalesAdministrationEntity> findAllByPeriodCodeAndAdministrationCodeAndSpatialVersion(
        String periodCode, String administrationCode, String spatialVersion);

    Optional<SalesAdministrationEntity> findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
        String periodCode, String administrationCode, String serviceCode, String spatialVersion);
}
