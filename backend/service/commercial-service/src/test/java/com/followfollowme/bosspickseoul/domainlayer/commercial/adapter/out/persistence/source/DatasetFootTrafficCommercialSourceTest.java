package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DatasetFootTrafficCommercialSourceTest {

    private static final String CODE = "3110008";

    @Mock
    private DatasetFactRepository datasetFactRepository;

    @InjectMocks
    private DatasetFootTrafficCommercialSource source;

    @Test
    void multiRunLookupMapsEachRowBackToItsSlotPeriod() {
        Map<String, String> runIdByPeriod = new LinkedHashMap<>();
        runIdByPeriod.put("20241", "run-20241");
        runIdByPeriod.put("20242", "run-20242");
        when(datasetFactRepository.findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(runIdByPeriod.values(), CODE, DatasetFactId.NO_SERVICE))
            .thenReturn(List.of(fact("run-20242", "20242"), fact("run-20241", "20241")));

        List<FootTrafficCommercial> found = source.findAllByRunIdsAndCommercialCode(runIdByPeriod, CODE);

        // 분기는 payload 가 아니라 run_id → 슬롯 역인덱스에서 온다
        assertThat(found).extracting(FootTrafficCommercial::periodCode).containsExactlyInAnyOrder("20241", "20242");
        assertThat(found).allSatisfy(traffic -> assertThat(traffic.commercialCode()).isEqualTo(CODE));
    }

    @Test
    void payloadPeriodDisagreeingWithTheSlotFailsClosed() {
        // 배치 검증을 통과했다면 있을 수 없는 행이다. 트렌드 맵의 중복 키 500 이나 조용한 결손 대신 여기서 멈춘다.
        Map<String, String> runIdByPeriod = Map.of("20241", "run-20241");
        when(datasetFactRepository.findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(runIdByPeriod.values(), CODE, DatasetFactId.NO_SERVICE))
            .thenReturn(List.of(fact("run-20241", "20233")));

        assertThatThrownBy(() -> source.findAllByRunIdsAndCommercialCode(runIdByPeriod, CODE)).isInstanceOf(DatasetException.class);
    }

    @Test
    void emptyRunMapSkipsTheQuery() {
        assertThat(source.findAllByRunIdsAndCommercialCode(Map.of(), CODE)).isEmpty();
        verify(datasetFactRepository, never()).findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(anyCollection(), eq(CODE), eq(DatasetFactId.NO_SERVICE));
    }

    private static DatasetFactEntity fact(String runId, String payloadPeriod) {
        Map<String, String> row = new HashMap<>();
        row.put("STDR_YYQU_CD", payloadPeriod);
        row.put("TRDAR_SE_CD", "A");
        row.put("TRDAR_SE_CD_NM", "골목상권");
        row.put("TRDAR_CD_NM", "배화여자대학교");
        for (String key : List.of("TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO", "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO",
            "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO", "TMZON_00_06_FLPOP_CO",
            "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
            "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")) {
            row.put(key, "10");
        }
        return DatasetFactEntity.builder().id(new DatasetFactId(runId, CODE, DatasetFactId.NO_SERVICE)).payload(row).build();
    }
}
