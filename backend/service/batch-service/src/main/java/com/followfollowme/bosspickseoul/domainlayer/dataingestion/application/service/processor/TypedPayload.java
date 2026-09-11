package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** {@code dataset_fact.payload} 문자열 맵을 컬럼 값으로 읽는다. 파싱 실패는 fail-closed. */
final class TypedPayload {

    static final String PERIOD = "STDR_YYQU_CD";

    private TypedPayload() {
    }

    static void requirePeriod(Map<String, String> fields, String periodCode) {
        String payloadPeriod = textOrNull(fields, PERIOD);
        if (payloadPeriod != null && !payloadPeriod.equals(periodCode)) {
            throw new IllegalStateException("payload period " + payloadPeriod + " does not match slot " + periodCode);
        }
    }

    static void requireAll(Map<String, String> fields, Iterable<String> keys) {
        for (String key : keys) {
            if (textOrNull(fields, key) == null) {
                throw new IllegalStateException("required field missing: " + key);
            }
        }
    }

    static String text(Map<String, String> fields, String key) {
        String value = textOrNull(fields, key);
        if (value == null) {
            throw new IllegalStateException("required field missing: " + key);
        }
        return value;
    }

    static String textOrNull(Map<String, String> fields, String key) {
        String value = fields.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    static String textOr(Map<String, String> fields, String key, String fallback) {
        String value = textOrNull(fields, key);
        return value == null ? fallback : value;
    }

    static long longValue(Map<String, String> fields, String key) {
        Long value = longOrNull(fields, key);
        if (value == null) {
            throw new IllegalStateException("required field missing: " + key);
        }
        return value;
    }

    static Long longOrNull(Map<String, String> fields, String key) {
        String value = textOrNull(fields, key);
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.trim()).setScale(0, RoundingMode.HALF_UP).longValueExact();
        } catch (ArithmeticException | NumberFormatException exception) {
            throw new IllegalStateException("numeric field invalid: " + key);
        }
    }

    static Integer intOrNull(Map<String, String> fields, String key) {
        Long value = longOrNull(fields, key);
        if (value == null) {
            return null;
        }
        if (value < Integer.MIN_VALUE || value > Integer.MAX_VALUE) {
            throw new IllegalStateException("numeric field invalid: " + key);
        }
        return value.intValue();
    }

    static int intValue(Map<String, String> fields, String key) {
        Integer value = intOrNull(fields, key);
        if (value == null) {
            throw new IllegalStateException("required field missing: " + key);
        }
        return value;
    }

    static double doubleValue(Map<String, String> fields, String key) {
        String value = textOrNull(fields, key);
        if (value == null) {
            throw new IllegalStateException("required field missing: " + key);
        }
        try {
            return new BigDecimal(value.trim()).doubleValue();
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("numeric field invalid: " + key);
        }
    }
}
