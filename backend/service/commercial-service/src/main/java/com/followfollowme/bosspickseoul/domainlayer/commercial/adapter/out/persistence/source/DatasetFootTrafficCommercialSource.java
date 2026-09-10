package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 배치가 게시한 {@code dataset_fact} 릴리스에서 유동인구를 읽는다. 호출자가 분기별 활성 run_id 를 이미 해석했으므로
 * run_id 접두 PK 조회만 한다. 유동인구는 업종 차원이 없어 service_code 는 빈 문자열이다.
 */
@Component
@RequiredArgsConstructor
public class DatasetFootTrafficCommercialSource {

    private final DatasetFactRepository datasetFactRepository;

    public Optional<FootTrafficCommercial> findByRunIdAndCommercialCode(String runId, String slotPeriod, String commercialCode) {
        return datasetFactRepository.findByIdRunIdAndIdAreaCodeAndIdServiceCode(runId, commercialCode, DatasetFactId.NO_SERVICE)
            .map(fact -> FootTrafficCommercialFactMapper.toDomain(fact, slotPeriod));
    }

    /** {@code runIdByPeriod} 는 분기 → 활성 run_id. 한 번의 IN 조회로 여러 분기를 받아 분기 시계열을 만든다. */
    public List<FootTrafficCommercial> findAllByRunIdsAndCommercialCode(Map<String, String> runIdByPeriod, String commercialCode) {
        if (runIdByPeriod.isEmpty()) {
            return List.of();
        }
        Map<String, String> periodByRunId = runIdByPeriod.entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
        return datasetFactRepository.findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(runIdByPeriod.values(), commercialCode, DatasetFactId.NO_SERVICE)
            .stream()
            .map(fact -> FootTrafficCommercialFactMapper.toDomain(fact, periodByRunId.get(fact.getId().getRunId())))
            .toList();
    }
}
