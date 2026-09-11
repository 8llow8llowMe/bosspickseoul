package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TypedFactMappersTest {

    @Test
    void mapsFootTrafficCommercialAndLeavesServiceTypeNullOnStore() {
        Object[] foot = TypedFactMappers.columns(
            Dataset.FOOT_TRAFFIC_COMMERCIAL, new FactRow(1L, "3110008", "", footFields()),
            "20241", "legacy-20233");
        assertThat(foot[0]).isEqualTo("20241");
        assertThat(foot[1]).isEqualTo("legacy-20233");
        assertThat(foot[2]).isEqualTo("3110008");
        assertThat(foot[6]).isEqualTo(100L);

        Object[] store = TypedFactMappers.columns(
            Dataset.STORE_COMMERCIAL, new FactRow(1L, "3110008", "CS100001", storeFields()),
            "20241", "legacy-20233");
        assertThat(store[6]).isEqualTo("CS100001");
        assertThat(store[8]).isNull();
    }

    @Test
    void consumptionIncomeColumnsStayNullWhenSourceOmitsThem() {
        Object[] row = TypedFactMappers.columns(
            Dataset.CONSUMPTION_COMMERCIAL, new FactRow(1L, "3110008", "", consumptionFields()),
            "20241", "legacy-20233");
        assertThat(row[6]).isNull();
        assertThat(row[7]).isNull();
        assertThat(row[8]).isEqualTo(900L);
    }

    @Test
    void missingRequiredFieldFailsClosed() {
        Map<String, String> fields = footFields();
        fields.remove("TOT_FLPOP_CO");
        assertThatThrownBy(() -> TypedFactMappers.columns(
            Dataset.FOOT_TRAFFIC_COMMERCIAL, new FactRow(1L, "3110008", "", fields),
            "20241", "legacy-20233"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("TOT_FLPOP_CO");
    }

    private static Map<String, String> footFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("TOT_FLPOP_CO", "100");
        fields.put("ML_FLPOP_CO", "40");
        fields.put("FML_FLPOP_CO", "60");
        for (String key : Dataset.FOOT_TRAFFIC_COMMERCIAL.requiredMetrics()) {
            fields.putIfAbsent(key, "1");
        }
        return fields;
    }

    private static Map<String, String> storeFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : Dataset.STORE_COMMERCIAL.requiredMetrics()) {
            fields.put(key, key.endsWith("_RT") ? "1.5" : "10");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("SVC_INDUTY_CD", "CS100001");
        fields.put("SVC_INDUTY_CD_NM", "한식");
        return fields;
    }

    private static Map<String, String> consumptionFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : Dataset.CONSUMPTION_COMMERCIAL.requiredMetrics()) {
            fields.put(key, "1");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("EXPNDTR_TOTAMT", "900");
        return fields;
    }
}
