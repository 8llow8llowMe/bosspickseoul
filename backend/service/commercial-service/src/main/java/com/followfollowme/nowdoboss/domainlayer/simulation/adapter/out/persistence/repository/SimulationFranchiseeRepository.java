package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationFranchiseeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationFranchiseeRepository extends JpaRepository<SimulationFranchiseeEntity, Long> {

    List<SimulationFranchiseeEntity> findAllByBaseYearAndServiceCode(String baseYear, String serviceCode);

    List<SimulationFranchiseeEntity> findTop10ByBaseYearAndServiceCodeAndIdGreaterThanOrderByIdAsc(
        String baseYear, String serviceCode, long lastId);

    List<SimulationFranchiseeEntity> findTop10ByBaseYearAndServiceCodeAndBrandNameContainingAndIdGreaterThanOrderByIdAsc(
        String baseYear, String serviceCode, String keyword, long lastId);
}
