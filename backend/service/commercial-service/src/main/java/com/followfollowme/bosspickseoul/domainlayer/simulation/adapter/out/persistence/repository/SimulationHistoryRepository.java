package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity.SimulationHistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationHistoryRepository extends JpaRepository<SimulationHistoryEntity, Long> {

    // createdAt 이 같은 행이 페이지 경계에서 중복/누락되지 않도록 id 를 2차 정렬로 둔다
    // (분석 보관함과 동일한 규칙).
    Page<SimulationHistoryEntity> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);
}
