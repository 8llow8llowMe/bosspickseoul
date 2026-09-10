package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.DatasetChangeCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.LegacyChangeCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.DatasetReadRouter;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 상권 변화지표 out-port 의 라우팅 어댑터. 분기마다 {@link DatasetReadRouter} 가 활성 데이터셋 릴리스를 돌려주면 그 run 에서,
 * 아니면 레거시 {@code change_commercial} 에서 읽는다. 포트 계약과 프로세서는 어느 소스인지 모른다.
 *
 * <p>레거시 {@code change_commercial} 은 v1 마이그레이션에서 원천을 못 찾아 비어 있다. 그래서 이 데이터셋이 데이터셋 경로의 첫
 * 전환 대상이다 — 어떤 결과가 나와도 회귀가 아니다.
 */
@Component
@RequiredArgsConstructor
public class ChangeCommercialRepositoryAdapter implements ChangeCommercialRepositoryPort {

    private final DatasetReadRouter datasetReadRouter;
    private final LegacyChangeCommercialSource legacySource;
    private final DatasetChangeCommercialSource datasetSource;

    @Override
    public Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return datasetReadRouter.datasetRunId(DatasetKey.CHANGE_COMMERCIAL, periodCode)
            .map(runId -> datasetSource.findByRunIdAndCommercialCode(runId, periodCode, commercialCode))
            .orElseGet(() -> legacySource.findByPeriodCodeAndCommercialCode(periodCode, commercialCode));
    }

    @Override
    public List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes) {
        return datasetReadRouter.datasetRunId(DatasetKey.CHANGE_COMMERCIAL, periodCode)
            .map(runId -> datasetSource.findAllByRunIdAndCommercialCodeIn(runId, periodCode, commercialCodes))
            .orElseGet(() -> legacySource.findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes));
    }
}
