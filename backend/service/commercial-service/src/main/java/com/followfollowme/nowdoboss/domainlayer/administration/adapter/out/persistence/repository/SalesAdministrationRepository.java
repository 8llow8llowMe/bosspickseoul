package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesAdministrationRepository extends JpaRepository<SalesAdministrationEntity, Long> {

    Optional<SalesAdministrationEntity> findByPeriodCodeAndAdministrationCodeAndServiceCode(
        String periodCode, String administrationCode, String serviceCode);
}
