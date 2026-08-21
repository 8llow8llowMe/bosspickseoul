package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command.AnalysisBookmarkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분석 화면 보관함 저장/삭제.
 * payload 정규화(JSON key 정렬)와 해시 규칙은 공유 링크(ShareLinkCommandProcessor)와 동일해서,
 * 같은 화면 상태는 항상 같은 해시가 되고 회원별 중복 저장을 막을 수 있다.
 */
@Component
public class AnalysisBookmarkCommandProcessor {

    private static final int PAYLOAD_MAX_LENGTH = 2000;

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final AnalysisBookmarkRepositoryPort analysisBookmarkRepositoryPort;
    // 같은 화면 상태가 항상 같은 문자열이 되도록 key 정렬을 강제한 payload 정규화 전용 mapper.
    private final ObjectMapper canonicalObjectMapper;

    public AnalysisBookmarkCommandProcessor(
        SnowflakeIdGenerator snowflakeIdGenerator,
        AnalysisBookmarkRepositoryPort analysisBookmarkRepositoryPort,
        ObjectMapper objectMapper
    ) {
        this.snowflakeIdGenerator = snowflakeIdGenerator;
        this.analysisBookmarkRepositoryPort = analysisBookmarkRepositoryPort;
        this.canonicalObjectMapper = objectMapper.copy()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    @Transactional
    public AnalysisBookmark create(long memberId, AnalysisBookmarkCreateCommand command) {
        ShareTargetType shareType = parseShareType(command.shareType());
        String canonicalPayload = canonicalize(command.payload());
        String payloadHash = sha256Hex(shareType.name() + "|" + canonicalPayload);

        if (analysisBookmarkRepositoryPort.existsByMemberIdAndPayloadHash(memberId, payloadHash)) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.ALREADY_BOOKMARKED);
        }

        return analysisBookmarkRepositoryPort.save(AnalysisBookmark.builder()
            .id(snowflakeIdGenerator.generateId())
            .memberId(memberId)
            .shareType(shareType)
            .payload(canonicalPayload)
            .payloadHash(payloadHash)
            .bookmarkName(normalizeBookmarkName(command.bookmarkName()))
            .createdAt(LocalDateTime.now())
            .build());
    }

    @Transactional
    public void delete(long memberId, long bookmarkId) {
        AnalysisBookmark bookmark = analysisBookmarkRepositoryPort.findById(bookmarkId)
            .orElseThrow(() -> new AnalysisBookmarkException(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND));
        // 타인 항목은 존재 여부를 노출하지 않도록 동일하게 404 로 응답한다.
        if (bookmark.memberId() != memberId) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
        }
        analysisBookmarkRepositoryPort.deleteById(bookmarkId);
    }

    private ShareTargetType parseShareType(String value) {
        if (value == null) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE);
        }
        try {
            return ShareTargetType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE);
        }
    }

    private String canonicalize(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.PAYLOAD_NOT_OBJECT);
        }

        String canonical;
        try {
            canonical = canonicalObjectMapper.writeValueAsString(
                canonicalObjectMapper.treeToValue(payload, Object.class)
            );
        } catch (JsonProcessingException exception) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.PAYLOAD_NOT_OBJECT);
        }

        if (canonical.length() > PAYLOAD_MAX_LENGTH) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.PAYLOAD_TOO_LARGE);
        }
        return canonical;
    }

    private String normalizeBookmarkName(String bookmarkName) {
        return bookmarkName == null || bookmarkName.isBlank() ? null : bookmarkName.trim();
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", exception);
        }
    }
}
