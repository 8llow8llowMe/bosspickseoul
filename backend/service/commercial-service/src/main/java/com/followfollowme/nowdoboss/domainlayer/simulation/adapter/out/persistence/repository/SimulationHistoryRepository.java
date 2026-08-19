package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationHistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationHistoryRepository extends JpaRepository<SimulationHistoryEntity, Long> {

    Page<SimulationHistoryEntity> findAllByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);
}
