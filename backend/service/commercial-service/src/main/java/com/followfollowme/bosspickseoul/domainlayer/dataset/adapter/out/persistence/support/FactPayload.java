package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.support;

import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

/**
 * {@code dataset_fact.payload} 를 도메인 타입으로 읽는다. 키는 서울 Open API 컬럼 코드, 값은 평문 십진수 문자열이다.
 *
 * <p>fail-closed: 필수 키가 없거나 숫자로 읽을 수 없으면 {@link DatasetException}(DATASET_001) 을 던진다.
 * 원천이 컬럼 이름을 바꾸면 조용히 0 이나 null 이 들어가는 대신 여기서 멈춘다. 어떤 키가 문제인지는 로그에 남기고
 * 응답 메시지에는 싣지 않는다. 정수 필드에 소수가 오면 HALF_UP 으로 반올림한다(레거시 마이그레이션이 정수 컬럼에
 * 넣던 값과 같은 자리수).
 */
@Slf4j
public record FactPayload(Map<String, String> fields) {

    public String text(String key) {
        String value = textOrNull(key);
        if (value == null) {
            throw invalid(key, "missing");
        }
        return value;
    }

    public String textOrNull(String key) {
        String value = fields.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    public long longValue(String key) {
        return toLong(key, text(key));
    }

    public Long longOrNull(String key) {
        String value = textOrNull(key);
        return value == null ? null : toLong(key, value);
    }

    public int intValue(String key) {
        return toInt(key, text(key));
    }

    public Integer intOrNull(String key) {
        String value = textOrNull(key);
        return value == null ? null : toInt(key, value);
    }

    public double doubleValue(String key) {
        return decimal(key, text(key)).doubleValue();
    }

    public Double doubleOrNull(String key) {
        String value = textOrNull(key);
        return value == null ? null : decimal(key, value).doubleValue();
    }

    private long toLong(String key, String value) {
        try {
            return decimal(key, value).setScale(0, RoundingMode.HALF_UP).longValueExact();
        } catch (ArithmeticException exception) {
            throw invalid(key, "out-of-range");
        }
    }

    private int toInt(String key, String value) {
        try {
            return decimal(key, value).setScale(0, RoundingMode.HALF_UP).intValueExact();
        } catch (ArithmeticException exception) {
            throw invalid(key, "out-of-range");
        }
    }

    private BigDecimal decimal(String key, String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            throw invalid(key, "not-a-number");
        }
    }

    private DatasetException invalid(String key, String reason) {
        log.warn("dataset payload field invalid key={} reason={}", key, reason);
        return new DatasetException(DatasetErrorCode.PAYLOAD_FIELD_INVALID);
    }
}
