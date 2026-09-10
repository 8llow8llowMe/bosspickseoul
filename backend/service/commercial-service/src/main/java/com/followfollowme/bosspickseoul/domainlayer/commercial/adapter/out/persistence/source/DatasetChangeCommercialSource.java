package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 배치가 게시한 {@code dataset_fact} 릴리스에서 읽는다. 호출자(라우팅 어댑터)가 분기의 활성 run_id 를 이미 해석했으므로
 * 여기서는 run_id 접두 PK 조회만 한다. 상권 변화지표는 업종 차원이 없어 service_code 는 빈 문자열이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatasetChangeCommercialSource {

    private final DatasetFactRepository datasetFactRepository;

    public Optional<ChangeCommercial> findByRunIdAndCommercialCode(String runId, String slotPeriod, String commercialCode) {
        return datasetFactRepository.findByIdRunIdAndIdAreaCodeAndIdServiceCode(runId, commercialCode, DatasetFactId.NO_SERVICE)
            .map(fact -> ChangeCommercialFactMapper.toDomain(fact, slotPeriod));
    }

    public List<ChangeCommercial> findAllByRunIdAndCommercialCodeIn(String runId, String slotPeriod, List<String> commercialCodes) {
        if (commercialCodes.isEmpty()) {
            return List.of();
        }
        // 벌크 소비자(히트맵)는 레거시에서도 "행 없음 = 그 상권만 기본 위험계수" 였다. 한 행의 결함이 요청 전체를 500 으로
        // 승격하지 않도록 행 단위로 fail-closed 하고 그 행만 제외한다. 단건 조회는 그대로 예외를 던진다.
        List<ChangeCommercial> result = new ArrayList<>(commercialCodes.size());
        for (var fact : datasetFactRepository.findAllByIdRunIdAndIdAreaCodeInAndIdServiceCode(runId, commercialCodes, DatasetFactId.NO_SERVICE)) {
            try {
                result.add(ChangeCommercialFactMapper.toDomain(fact, slotPeriod));
            } catch (DatasetException exception) {
                log.warn("dataset row skipped dataset=CHANGE_COMMERCIAL runId={} areaCode={} reason={}",
                    runId, fact.getId().getAreaCode(), exception.getErrorCode().getCode());
            }
        }
        return result;
    }
}
