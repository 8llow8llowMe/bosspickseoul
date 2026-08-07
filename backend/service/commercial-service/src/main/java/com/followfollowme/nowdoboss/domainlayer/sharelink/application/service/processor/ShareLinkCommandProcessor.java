package com.followfollowme.nowdoboss.domainlayer.sharelink.application.service.processor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.command.ShareLinkCreateCommand;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import com.followfollowme.nowdoboss.global.properties.ShareLinkProperties;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ShareLinkCommandProcessor {

    private static final String CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int CODE_LENGTH = 8;
    private static final int MAX_CODE_GENERATION_RETRY = 5;
    private static final int PAYLOAD_MAX_LENGTH = 2000;

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final ShareLinkRepositoryPort shareLinkRepositoryPort;
    private final ShareLinkProperties shareLinkProperties;
    // 같은 화면 상태가 항상 같은 문자열이 되도록 key 정렬을 강제한 payload 정규화 전용 mapper.
    private final ObjectMapper canonicalObjectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    public ShareLinkCommandProcessor(
        SnowflakeIdGenerator snowflakeIdGenerator,
        ShareLinkRepositoryPort shareLinkRepositoryPort,
        ShareLinkProperties shareLinkProperties,
        ObjectMapper objectMapper
    ) {
        this.snowflakeIdGenerator = snowflakeIdGenerator;
        this.shareLinkRepositoryPort = shareLinkRepositoryPort;
        this.shareLinkProperties = shareLinkProperties;
        this.canonicalObjectMapper = objectMapper.copy()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    /**
     * 공유 링크를 생성한다.
     *
     * <p>payload 정규화(JSON key 정렬) 후 해시로 중복을 판정하므로, 같은 화면 상태를 다시 공유하면
     * 새 행을 만들지 않고 기존 공유 코드의 만료 시각만 연장해 돌려준다.
     */
    @Transactional
    public ShareLink createShareLink(long memberId, ShareLinkCreateCommand command) {
        ShareTargetType shareType = ShareTargetType.from(command.shareType());
        String canonicalPayload = canonicalize(command.payload());
        String payloadHash = sha256Hex(shareType.name() + "|" + canonicalPayload);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(shareLinkProperties.ttlDays());

        return shareLinkRepositoryPort.findByPayloadHash(payloadHash)
            .map(existing -> shareLinkRepositoryPort.save(new ShareLink(
                existing.id(),
                existing.shareCode(),
                existing.shareType(),
                existing.payload(),
                existing.payloadHash(),
                existing.memberId(),
                expiresAt,
                existing.createdAt(),
                now
            )))
            .orElseGet(() -> shareLinkRepositoryPort.save(new ShareLink(
                snowflakeIdGenerator.generateId(),
                generateUniqueShareCode(),
                shareType,
                canonicalPayload,
                payloadHash,
                memberId,
                expiresAt,
                now,
                now
            )));
    }

    private String canonicalize(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new ShareLinkException(ShareLinkErrorCode.PAYLOAD_NOT_OBJECT);
        }

        String canonical;
        try {
            canonical = canonicalObjectMapper.writeValueAsString(
                canonicalObjectMapper.treeToValue(payload, Object.class)
            );
        } catch (JsonProcessingException exception) {
            throw new ShareLinkException(ShareLinkErrorCode.PAYLOAD_NOT_OBJECT);
        }

        if (canonical.length() > PAYLOAD_MAX_LENGTH) {
            throw new ShareLinkException(ShareLinkErrorCode.PAYLOAD_TOO_LARGE);
        }
        return canonical;
    }

    private String generateUniqueShareCode() {
        for (int attempt = 0; attempt < MAX_CODE_GENERATION_RETRY; attempt++) {
            String shareCode = generateShareCode();
            if (!shareLinkRepositoryPort.existsByShareCode(shareCode)) {
                return shareCode;
            }
        }
        throw new ShareLinkException(ShareLinkErrorCode.SHARE_CODE_GENERATION_FAILED);
    }

    private String generateShareCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_ALPHABET.charAt(secureRandom.nextInt(CODE_ALPHABET.length())));
        }
        return builder.toString();
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
