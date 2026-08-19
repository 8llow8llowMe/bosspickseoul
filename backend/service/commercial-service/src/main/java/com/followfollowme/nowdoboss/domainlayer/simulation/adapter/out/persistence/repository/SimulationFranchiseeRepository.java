package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationFranchiseeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationFranchiseeRepository extends JpaRepository<SimulationFranchiseeEntity, Long> {

    List<SimulationFranchiseeEntity> findAllByServiceCode(String serviceCode);

    List<SimulationFranchiseeEntity> findTop10ByServiceCodeAndIdGreaterThanOrderByIdAsc(String serviceCode, long lastId);

    List<SimulationFranchiseeEntity> findTop10ByServiceCodeAndBrandNameContainingAndIdGreaterThanOrderByIdAsc(
        String serviceCode, String keyword, long lastId);
}
