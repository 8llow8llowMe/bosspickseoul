package com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationFranchisee;
import java.util.List;
import java.util.Optional;

public interface SimulationFranchiseeRepositoryPort {

    Optional<SimulationFranchisee> findById(long franchiseeId);

    List<SimulationFranchisee> findAllByServiceCode(String serviceCode);

    /**
     * 브랜드명 키워드 + 커서(lastId) 기반 검색. 최대 10건을 id 오름차순으로 반환한다.
     */
    List<SimulationFranchisee> searchByServiceCode(String serviceCode, String keyword, long lastId);
}
