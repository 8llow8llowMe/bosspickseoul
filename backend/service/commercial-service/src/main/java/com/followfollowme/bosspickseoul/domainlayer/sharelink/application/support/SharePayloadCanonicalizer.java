package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

/**
 * 화면 상태 payload 의 정규화(JSON key 정렬)와 해시 규칙의 단일 기준점.
 *
 * <p>공유 링크(sharelink)와 분석 보관함(analysisbookmark)이 함께 사용한다.
 * 두 컨텍스트의 중복 판정은 "같은 화면 상태 = 같은 정규화 문자열 = 같은 해시"라는 불변식에
 * 의존하므로, 규칙 변경은 반드시 이 클래스에서만 이뤄져야 한다.
 */
@Component
public class SharePayloadCanonicalizer {

    public static final int PAYLOAD_MAX_LENGTH = 2000;

    // 같은 화면 상태가 항상 같은 문자열이 되도록 key 정렬을 강제한 payload 정규화 전용 mapper.
    private final ObjectMapper canonicalObjectMapper;

    public SharePayloadCanonicalizer(ObjectMapper objectMapper) {
        this.canonicalObjectMapper = objectMapper.copy()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    /**
     * payload 를 key 정렬된 JSON 문자열로 정규화한다.
     *
     * @throws PayloadNotObjectException payload 가 JSON 객체가 아니거나 직렬화할 수 없는 경우
     * @throws PayloadTooLargeException 정규화 결과가 {@link #PAYLOAD_MAX_LENGTH} 를 초과하는 경우
     */
    public String canonicalize(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new PayloadNotObjectException();
        }

        String canonical;
        try {
            canonical = canonicalObjectMapper.writeValueAsString(
                canonicalObjectMapper.treeToValue(payload, Object.class)
            );
        } catch (JsonProcessingException exception) {
            throw new PayloadNotObjectException();
        }

        if (canonical.length() > PAYLOAD_MAX_LENGTH) {
            throw new PayloadTooLargeException();
        }
        return canonical;
    }

    /** 화면 타입까지 포함해 해시를 만든다. 같은 payload 라도 화면 타입이 다르면 다른 상태로 본다. */
    public String payloadHash(ShareTargetType shareType, String canonicalPayload) {
        return sha256Hex(shareType.name() + "|" + canonicalPayload);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", exception);
        }
    }

    /** payload 가 JSON 객체가 아니다. 사용하는 컨텍스트가 자신의 에러 코드로 번역한다. */
    public static class PayloadNotObjectException extends RuntimeException {
    }

    /** 정규화된 payload 가 허용 길이를 초과했다. 사용하는 컨텍스트가 자신의 에러 코드로 번역한다. */
    public static class PayloadTooLargeException extends RuntimeException {
    }
}
