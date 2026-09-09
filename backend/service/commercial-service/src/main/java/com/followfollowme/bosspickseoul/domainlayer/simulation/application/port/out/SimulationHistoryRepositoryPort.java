package com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.query.SimulationHistoryPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationHistory;

public interface SimulationHistoryRepositoryPort {

    SimulationHistory save(SimulationHistory history);

    /**
     * 회원의 저장 이력을 최신순 페이지로 조회한다.
     * 페이징 구현(Pageable)은 어댑터 내부 세부사항으로 감춘다.
     */
    SimulationHistoryPageQueryResult findAllByMemberId(long memberId, int page, int size);

    /** 소유자 조건을 포함해 삭제하고 삭제 건수를 돌려준다 (0 이면 미존재 또는 타인 항목). */
    int deleteByIdAndMemberId(long historyId, long memberId);
}
