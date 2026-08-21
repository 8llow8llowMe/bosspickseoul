package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity.SimulationRentEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRentRepository extends JpaRepository<SimulationRentEntity, Long> {

    Optional<SimulationRentEntity> findByBaseYearAndDistrictCode(String baseYear, String districtCode);
}
