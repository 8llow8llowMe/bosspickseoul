package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity.SimulationHistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface SimulationHistoryRepository extends JpaRepository<SimulationHistoryEntity, Long> {

    // createdAt 이 같은 행이 페이지 경계에서 중복/누락되지 않도록 id 를 2차 정렬로 둔다
    // (분석 보관함과 동일한 규칙).
    Page<SimulationHistoryEntity> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);

    /** 소유자 조건을 DELETE 에 포함해 단일 쿼리로 처리한다 (엔티티 로딩 없음). 분석 보관함과 동일한 규칙. */
    @Modifying
    @Query("delete from SimulationHistoryEntity h where h.id = :historyId and h.memberId = :memberId")
    int deleteByIdAndMemberId(Long historyId, Long memberId);
}
