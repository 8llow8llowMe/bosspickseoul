package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreAdministrationRepository extends JpaRepository<StoreAdministrationEntity, Long> {

    List<StoreAdministrationEntity> findAllByPeriodCodeAndAdministrationCode(String periodCode, String administrationCode);
}
