package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 배치가 게시한 {@code dataset_fact} 릴리스에서 읽는다. 호출자(라우팅 어댑터)가 분기의 활성 run_id 를 이미 해석했으므로
 * 여기서는 run_id 접두 PK 조회만 한다. 상권 변화지표는 업종 차원이 없어 service_code 는 빈 문자열이다.
 */
@Component
@RequiredArgsConstructor
public class DatasetChangeCommercialSource {

    static final String NO_SERVICE = "";

    private final DatasetFactRepository datasetFactRepository;

    public Optional<ChangeCommercial> findByRunIdAndCommercialCode(String runId, String periodCode, String commercialCode) {
        return datasetFactRepository.findByIdRunIdAndIdAreaCodeAndIdServiceCode(runId, commercialCode, NO_SERVICE)
            .map(fact -> ChangeCommercialFactMapper.toDomain(fact, periodCode));
    }

    public List<ChangeCommercial> findAllByRunIdAndCommercialCodeIn(String runId, String periodCode, List<String> commercialCodes) {
        if (commercialCodes.isEmpty()) {
            return List.of();
        }
        return datasetFactRepository.findAllByIdRunIdAndIdAreaCodeInAndIdServiceCode(runId, commercialCodes, NO_SERVICE)
            .stream()
            .map(fact -> ChangeCommercialFactMapper.toDomain(fact, periodCode))
            .toList();
    }
}
