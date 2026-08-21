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
}
