package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FootTrafficCommercialFactMapperTest {

    private static final List<String> METRIC_CODES = List.of(
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO");

    /** 서울 API VwsmTrdarFlpopQq 한 행. 지표마다 다른 값을 넣어 컬럼이 서로 바뀌면 잡히게 한다. */
    private static Map<String, String> apiRow() {
        Map<String, String> row = new HashMap<>();
        row.put("STDR_YYQU_CD", "20241");
        row.put("TRDAR_SE_CD", "A");
        row.put("TRDAR_SE_CD_NM", "골목상권");
        row.put("TRDAR_CD", "3110008");
        row.put("TRDAR_CD_NM", "배화여자대학교(박노수미술관)");
        for (int i = 0; i < METRIC_CODES.size(); i++) {
            row.put(METRIC_CODES.get(i), String.valueOf(1000 + i));
        }
        return row;
    }

    @Test
    void mapsEveryMetricToItsOwnColumn() {
        FootTrafficCommercial traffic = FootTrafficCommercialFactMapper.toDomain(fact(apiRow()), "20241");

        assertThat(traffic.periodCode()).isEqualTo("20241");
        assertThat(traffic.commercialCode()).isEqualTo("3110008");
        assertThat(traffic.commercialName()).isEqualTo("배화여자대학교(박노수미술관)");
        assertThat(List.of(
            traffic.totalFootTraffic(), traffic.maleFootTraffic(), traffic.femaleFootTraffic(),
            traffic.age10FootTraffic(), traffic.age20FootTraffic(), traffic.age30FootTraffic(), traffic.age40FootTraffic(),
            traffic.age50FootTraffic(), traffic.age60PlusFootTraffic(),
            traffic.footTrafficTime00To06(), traffic.footTrafficTime06To11(), traffic.footTrafficTime11To14(),
            traffic.footTrafficTime14To17(), traffic.footTrafficTime17To21(), traffic.footTrafficTime21To24(),
            traffic.mondayFootTraffic(), traffic.tuesdayFootTraffic(), traffic.wednesdayFootTraffic(), traffic.thursdayFootTraffic(),
            traffic.fridayFootTraffic(), traffic.saturdayFootTraffic(), traffic.sundayFootTraffic()))
            .containsExactlyElementsOf(java.util.stream.IntStream.range(0, METRIC_CODES.size()).mapToObj(i -> 1000L + i).toList());
    }

    @Test
    void periodFallsBackToTheRequestedOneWhenPayloadHasNone() {
        Map<String, String> row = apiRow();
        row.remove("STDR_YYQU_CD");

        assertThat(FootTrafficCommercialFactMapper.toDomain(fact(row), "20242").periodCode()).isEqualTo("20242");
    }

    @Test
    void everyMetricIsRequiredBecauseTheLegacyColumnsAreNotNull() {
        Map<String, String> row = apiRow();
        row.remove("SUN_FLPOP_CO");

        assertThatThrownBy(() -> FootTrafficCommercialFactMapper.toDomain(fact(row), "20241"))
            .isInstanceOf(DatasetException.class);
    }

    private static DatasetFactEntity fact(Map<String, String> payload) {
        return DatasetFactEntity.builder().id(new DatasetFactId("run-20241", "3110008", "")).payload(payload).build();
    }
}
