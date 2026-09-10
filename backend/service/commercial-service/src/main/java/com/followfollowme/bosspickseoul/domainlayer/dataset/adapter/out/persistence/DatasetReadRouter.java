package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 분기마다 "데이터셋 경로로 읽을 것인가" 를 결정한다. 팩트 out-port 의 라우팅 어댑터가 이 결정을 받아
 * {@code Legacy*Source} 와 {@code Dataset*Source} 를 고른다.
 *
 * <p>데이터셋 경로 조건은 셋이 모두 참일 때다: 플래그 on, 분기가 {@code read-from-period} 이상, 슬롯에 활성 release 있음.
 * 하나라도 아니면 레거시다. 그래서 20233(레거시)과 20241(데이터셋)이 한 요청(트렌드 8분기)에 섞여도 각 분기가 맞는
 * 소스로 간다. 분기 코드는 yyyyQ 다섯 자리라 문자열 비교가 시간 순서와 같다. 형식에 맞는 분기만 리졸버에 넘기므로
 * 캐시 키 공간은 데이터셋 15종 × 분기 수로 닫힌다.
 */
@Component
@RequiredArgsConstructor
public class DatasetReadRouter {

    private final DatasetReadProperties properties;
    private final DatasetReleaseResolver datasetReleaseResolver;

    /** 이 분기를 데이터셋 경로로 읽어야 하면 활성 run_id 를, 레거시로 읽어야 하면 empty 를 돌려준다. */
    public Optional<String> datasetRunId(DatasetKey dataset, String periodCode) {
        // 형식이 아닌 값은 레거시로 보낸다(거기서 404 가 난다). 요청 문자열이 그대로 리졸버 캐시 키가 되면
        // 서로 다른 값마다 엔트리와 DB 왕복이 하나씩 늘어 캐시가 무한히 자란다.
        if (!properties.readEnabled() || periodCode == null || !periodCode.matches(DatasetReadProperties.PERIOD_CODE_PATTERN)
            || periodCode.compareTo(properties.readFromPeriod()) < 0) {
            return Optional.empty();
        }
        return datasetReleaseResolver.activeRunId(dataset, periodCode);
    }

    /** 여러 분기를 소스별로 나눈다. 데이터셋 분기는 run_id 와 함께, 레거시 분기는 목록으로 돌려준다. 입력 순서를 지킨다. */
    public Split split(DatasetKey dataset, Collection<String> periodCodes) {
        Map<String, String> datasetRuns = new LinkedHashMap<>();
        List<String> legacyPeriods = new ArrayList<>();
        for (String periodCode : periodCodes) {
            datasetRunId(dataset, periodCode)
                .ifPresentOrElse(runId -> datasetRuns.put(periodCode, runId), () -> legacyPeriods.add(periodCode));
        }
        return new Split(datasetRuns, List.copyOf(legacyPeriods));
    }

    /** 분기 → run_id (데이터셋 경로) 와 레거시 분기 목록. */
    public record Split(Map<String, String> datasetRunsByPeriod, List<String> legacyPeriods) {

        public boolean hasDataset() {
            return !datasetRunsByPeriod.isEmpty();
        }

        public boolean hasLegacy() {
            return !legacyPeriods.isEmpty();
        }
    }
}
