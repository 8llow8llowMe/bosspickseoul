package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeAdministrationRepository extends JpaRepository<IncomeAdministrationEntity, Long> {

    Optional<IncomeAdministrationEntity> findByPeriodCodeAndAdministrationCode(String periodCode, String administrationCode);
}
