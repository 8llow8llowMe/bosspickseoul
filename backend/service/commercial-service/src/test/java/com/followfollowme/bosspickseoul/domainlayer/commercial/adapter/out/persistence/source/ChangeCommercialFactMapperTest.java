package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ChangeCommercialFactMapperTest {

    /** 서울 API VwsmTrdarIxQq 한 행을 배치가 평문 십진수로 정규화해 적재한 모양. */
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
        row.put("SU_OPR_SALE_MT_AVRG", "115");
        row.put("SU_CLS_SALE_MT_AVRG", "51");
        return row;
    }

    @Test
    void mapsEveryLegacyColumnFromApiColumnCodes() {
        ChangeCommercial change = ChangeCommercialFactMapper.toDomain(fact("run-20241", "3110008", apiRow()), "20241");

        assertThat(change.periodCode()).isEqualTo("20241");
        assertThat(change.commercialClassificationCode()).isEqualTo("A");
        assertThat(change.commercialClassificationName()).isEqualTo("골목상권");
        assertThat(change.commercialCode()).isEqualTo("3110008");
        assertThat(change.commercialName()).isEqualTo("배화여자대학교(박노수미술관)");
        assertThat(change.changeIndicatorCode()).isEqualTo("HH");
        assertThat(change.changeIndicatorName()).isEqualTo("다이나믹");
        assertThat(change.averageOpenedMonths()).isEqualTo(108);
        assertThat(change.averageClosedMonths()).as("소수는 HALF_UP 으로 정수 컬럼 자리수에 맞춘다").isEqualTo(53);
        assertThat(change.id()).as("데이터셋 행에는 surrogate id 가 없다").isZero();
    }

    @Test
    void commercialCodeComesFromTheKeyAndPeriodFallsBackToTheRequestedOne() {
        Map<String, String> row = apiRow();
        row.remove("STDR_YYQU_CD");
        row.put("TRDAR_CD", "9999999");  // payload 의 코드보다 키(area_code)를 믿는다 — 배치가 키로 검증·게시했다

        ChangeCommercial change = ChangeCommercialFactMapper.toDomain(fact("run-20241", "3110008", row), "20241");

        assertThat(change.commercialCode()).isEqualTo("3110008");
        assertThat(change.periodCode()).isEqualTo("20241");
    }

    @Test
    void optionalIndicatorFieldsMayBeAbsent() {
        Map<String, String> row = apiRow();
        row.remove("TRDAR_CHNGE_IX");
        row.remove("TRDAR_CHNGE_IX_NM");
        row.put("OPR_SALE_MT_AVRG", "");
        row.put("CLS_SALE_MT_AVRG", null);

        ChangeCommercial change = ChangeCommercialFactMapper.toDomain(fact("run-20241", "3110008", row), "20241");

        assertThat(change.changeIndicatorCode()).isNull();
        assertThat(change.changeIndicatorName()).isNull();
        assertThat(change.averageOpenedMonths()).isNull();
        assertThat(change.averageClosedMonths()).isNull();
    }

    @Test
    void missingRequiredNameFailsClosed() {
        Map<String, String> row = apiRow();
        row.remove("TRDAR_CD_NM");

        assertThatThrownBy(() -> ChangeCommercialFactMapper.toDomain(fact("run-20241", "3110008", row), "20241"))
            .isInstanceOf(DatasetException.class);
    }

    private static DatasetFactEntity fact(String runId, String areaCode, Map<String, String> payload) {
        return DatasetFactEntity.builder().id(new DatasetFactId(runId, areaCode, "")).payload(payload).build();
    }
}
