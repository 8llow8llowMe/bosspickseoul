package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationServiceTypeEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationServiceTypeRepository extends JpaRepository<SimulationServiceTypeEntity, Long> {

    Optional<SimulationServiceTypeEntity> findByBaseYearAndServiceCode(String baseYear, String serviceCode);
}
