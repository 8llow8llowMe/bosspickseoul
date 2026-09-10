package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.DatasetFootTrafficCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source.LegacyFootTrafficCommercialSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.DatasetReadRouter;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 상권 유동인구 out-port 의 라우팅 어댑터. 분기마다 {@link DatasetReadRouter} 가 활성 데이터셋 릴리스를 돌려주면 그 run 에서,
 * 아니면 레거시 {@code foot_traffic_commercial} 에서 읽는다.
 *
 * <p>트렌드(최근 8분기)처럼 여러 분기를 한 번에 읽는 조회는 분기를 소스별로 나눠 각각 조회한 뒤 합친다. 20233(레거시) 과
 * 20241(데이터셋) 이 한 요청에 섞이는 첫 경로다. 프로세서는 분기 코드로 맵을 만들므로 순서에 의존하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class FootTrafficCommercialRepositoryAdapter implements FootTrafficCommercialRepositoryPort {

    private final DatasetReadRouter datasetReadRouter;
    private final LegacyFootTrafficCommercialSource legacySource;
    private final DatasetFootTrafficCommercialSource datasetSource;

    @Override
    public Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return datasetReadRouter.datasetRunId(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, periodCode)
            .map(runId -> datasetSource.findByRunIdAndCommercialCode(runId, periodCode, commercialCode))
            .orElseGet(() -> legacySource.findByPeriodCodeAndCommercialCode(periodCode, commercialCode));
    }

    @Override
    public List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes) {
        DatasetReadRouter.Split split = datasetReadRouter.split(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, periodCodes);
        List<FootTrafficCommercial> result = new ArrayList<>(periodCodes.size());
        if (split.hasLegacy()) {
            result.addAll(legacySource.findByCommercialCodeAndPeriodCodeIn(commercialCode, split.legacyPeriods()));
        }
        if (split.hasDataset()) {
            result.addAll(datasetSource.findAllByRunIdsAndCommercialCode(split.datasetRunsByPeriod(), commercialCode));
        }
        return result;
    }
}
