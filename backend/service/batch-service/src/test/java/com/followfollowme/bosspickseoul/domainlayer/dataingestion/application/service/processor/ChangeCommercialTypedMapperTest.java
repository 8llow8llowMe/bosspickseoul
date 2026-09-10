package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ChangeCommercialTypedMapperTest {

    @Test
    void mapsApiColumnsOntoTypedFactColumns() {
        ChangeCommercialTypedRow row = ChangeCommercialTypedMapper.map(fact(apiRow()), "20241", "legacy-20233");

        assertThat(row.periodCode()).isEqualTo("20241");
        assertThat(row.spatialVersion()).isEqualTo("legacy-20233");
        assertThat(row.commercialCode()).isEqualTo("3110008");
        assertThat(row.commercialClassificationCode()).isEqualTo("A");
        assertThat(row.commercialClassificationName()).isEqualTo("골목상권");
        assertThat(row.commercialName()).isEqualTo("배화여자대학교(박노수미술관)");
        assertThat(row.changeIndicatorCode()).isEqualTo("HH");
        assertThat(row.changeIndicatorName()).isEqualTo("다이나믹");
        assertThat(row.averageOpenedMonths()).isEqualTo(108);
        assertThat(row.averageClosedMonths()).isEqualTo(53);
    }

    @Test
    void missingSharedReaderFieldFailsClosed() {
        for (String required : DatasetKey.CHANGE_COMMERCIAL.readerRequiredFields()) {
            Map<String, String> row = apiRow();
            row.remove(required);
            assertThatThrownBy(() -> ChangeCommercialTypedMapper.map(fact(row), "20241", "legacy-20233"))
                .as("missing %s", required)
                .isInstanceOf(IllegalStateException.class);
        }
    }

    @Test
    void periodMismatchFailsClosed() {
        Map<String, String> row = apiRow();
        row.put("STDR_YYQU_CD", "20242");
        assertThatThrownBy(() -> ChangeCommercialTypedMapper.map(fact(row), "20241", "legacy-20233"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("20242");
    }

    private static Map<String, String> apiRow() {
        Map<String, String> row = new HashMap<>();
        row.put("STDR_YYQU_CD", "20241");
        row.put("TRDAR_SE_CD", "A");
        row.put("TRDAR_SE_CD_NM", "골목상권");
        row.put("TRDAR_CD", "3110008");
        row.put("TRDAR_CD_NM", "배화여자대학교(박노수미술관)");
        row.put("TRDAR_CHNGE_IX", "HH");
        row.put("TRDAR_CHNGE_IX_NM", "다이나믹");
        row.put("OPR_SALE_MT_AVRG", "108");
        row.put("CLS_SALE_MT_AVRG", "52.5");
        return row;
    }

    private static FactRow fact(Map<String, String> payload) {
        return new FactRow(1L, "3110008", "", payload);
    }
}
