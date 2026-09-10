package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FactPayloadTest {

    @Test
    void readsPlainDecimalTextAsNumbers() {
        FactPayload payload = new FactPayload(Map.of(
            "TOT_FLPOP_CO", "503135509", "OPR_SALE_MT_AVRG", "31", "TRDAR_CHNGE_IX", "HH", "RATE", "12.5"));

        assertThat(payload.longValue("TOT_FLPOP_CO")).isEqualTo(503_135_509L);
        assertThat(payload.intValue("OPR_SALE_MT_AVRG")).isEqualTo(31);
        assertThat(payload.text("TRDAR_CHNGE_IX")).isEqualTo("HH");
        assertThat(payload.doubleValue("RATE")).isEqualTo(12.5);
    }

    @Test
    void roundsDecimalsHalfUpWhenAnIntegerIsExpected() {
        // 레거시 마이그레이션이 정수 컬럼에 넣던 자리수와 맞춘다. 31.5 → 32, 31.4 → 31
        FactPayload payload = new FactPayload(Map.of("A", "31.5", "B", "31.4"));

        assertThat(payload.intValue("A")).isEqualTo(32);
        assertThat(payload.intOrNull("B")).isEqualTo(31);
        assertThat(payload.longValue("A")).isEqualTo(32L);
    }

    @Test
    void nullableReadersReturnNullForMissingOrBlankValues() {
        Map<String, String> fields = new HashMap<>();
        fields.put("BLANK", "  ");
        fields.put("NULL", null);
        FactPayload payload = new FactPayload(fields);

        assertThat(payload.textOrNull("BLANK")).isNull();
        assertThat(payload.textOrNull("NULL")).isNull();
        assertThat(payload.textOrNull("ABSENT")).isNull();
        assertThat(payload.longOrNull("ABSENT")).isNull();
        assertThat(payload.intOrNull("BLANK")).isNull();
        assertThat(payload.doubleOrNull("NULL")).isNull();
    }

    @Test
    void requiredReadersFailClosedOnMissingOrNonNumericValues() {
        FactPayload payload = new FactPayload(Map.of("TEXT", "abc", "SCI", "5.03135509E8"));

        assertThatThrownBy(() -> payload.text("ABSENT"))
            .isInstanceOf(DatasetException.class)
            .extracting(error -> ((DatasetException) error).getErrorCode())
            .isEqualTo(DatasetErrorCode.PAYLOAD_FIELD_INVALID);
        assertThatThrownBy(() -> payload.longValue("TEXT"))
            .isInstanceOf(DatasetException.class)
            .extracting(error -> ((DatasetException) error).getErrorCode())
            .isEqualTo(DatasetErrorCode.PAYLOAD_FIELD_INVALID);
        // 배치가 평문 십진수로 정규화하지만, BigDecimal 이 지수 표기도 읽으므로 우연히 새어 들어와도 값은 맞다
        assertThat(payload.longValue("SCI")).isEqualTo(503_135_509L);
    }
}
