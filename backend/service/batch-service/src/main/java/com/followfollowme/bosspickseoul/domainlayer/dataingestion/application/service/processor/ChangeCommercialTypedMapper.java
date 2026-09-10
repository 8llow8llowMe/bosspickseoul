package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * {@code CHANGE_COMMERCIAL} payload → {@code change_commercial} 컬럼.
 * 필수 키는 {@link Dataset#CHANGE_COMMERCIAL} 의 행 검증 계약과 같다.
 */
public final class ChangeCommercialTypedMapper {

    static final String PERIOD = "STDR_YYQU_CD";
    static final String CLASSIFICATION_CODE = "TRDAR_SE_CD";
    static final String CLASSIFICATION_NAME = "TRDAR_SE_CD_NM";
    static final String COMMERCIAL_NAME = "TRDAR_CD_NM";
    static final String INDICATOR_CODE = "TRDAR_CHNGE_IX";
    static final String INDICATOR_NAME = "TRDAR_CHNGE_IX_NM";
    static final String OPENED_MONTHS = "OPR_SALE_MT_AVRG";
    static final String CLOSED_MONTHS = "CLS_SALE_MT_AVRG";

    private ChangeCommercialTypedMapper() {
    }

    public static ChangeCommercialTypedRow map(FactRow fact, String periodCode, String spatialVersion) {
        Map<String, String> fields = fact.fields();
        String payloadPeriod = textOrNull(fields, PERIOD);
        if (payloadPeriod != null && !payloadPeriod.equals(periodCode)) {
            throw new IllegalStateException("payload period " + payloadPeriod + " does not match slot " + periodCode);
        }
        for (String required : Dataset.CHANGE_COMMERCIAL.requiredMetrics()) {
            if (textOrNull(fields, required) == null) {
                throw new IllegalStateException("required field missing: " + required);
            }
        }
        return new ChangeCommercialTypedRow(
            periodCode,
            spatialVersion,
            fact.areaCode(),
            text(fields, CLASSIFICATION_CODE),
            text(fields, CLASSIFICATION_NAME),
            text(fields, COMMERCIAL_NAME),
            textOrNull(fields, INDICATOR_CODE),
            textOrNull(fields, INDICATOR_NAME),
            intOrNull(fields, OPENED_MONTHS),
            intOrNull(fields, CLOSED_MONTHS)
        );
    }

    private static String text(Map<String, String> fields, String key) {
        String value = textOrNull(fields, key);
        if (value == null) {
            throw new IllegalStateException("required field missing: " + key);
        }
        return value;
    }

    private static String textOrNull(Map<String, String> fields, String key) {
        String value = fields.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    private static Integer intOrNull(Map<String, String> fields, String key) {
        String value = textOrNull(fields, key);
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.trim()).setScale(0, RoundingMode.HALF_UP).intValueExact();
        } catch (ArithmeticException | NumberFormatException exception) {
            throw new IllegalStateException("numeric field invalid: " + key);
        }
    }
}
