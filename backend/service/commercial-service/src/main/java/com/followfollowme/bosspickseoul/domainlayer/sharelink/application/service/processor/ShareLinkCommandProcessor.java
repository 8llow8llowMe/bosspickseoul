package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.service.processor;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.command.ShareLinkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.support.SharePayloadCanonicalizer;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.model.ShareLink;
import com.followfollowme.bosspickseoul.global.properties.ShareLinkProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ShareLinkCommandProcessor {

    private static final String CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int CODE_LENGTH = 8;
    private static final int MAX_CODE_GENERATION_RETRY = 5;

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final ShareLinkRepositoryPort shareLinkRepositoryPort;
    private final ShareLinkProperties shareLinkProperties;
    // 정규화/해시 규칙은 분석 보관함과 공유하는 단일 기준점이다.
    private final SharePayloadCanonicalizer sharePayloadCanonicalizer;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * 공유 링크를 생성한다. memberId는 비로그인 생성이면 null이다.
     *
     * <p>payload 정규화(JSON key 정렬) 후 해시로 중복을 판정하므로, 같은 화면 상태를 다시 공유하면
     * 새 행을 만들지 않고 기존 공유 코드의 만료 시각만 연장해 돌려준다.
     */
    @Transactional
    public ShareLink createShareLink(Long memberId, ShareLinkCreateCommand command) {
        ShareTargetType shareType = ShareTargetType.from(command.shareType());
        String canonicalPayload = canonicalize(command.payload());
        String payloadHash = sharePayloadCanonicalizer.payloadHash(shareType, canonicalPayload);

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
        try {
            return sharePayloadCanonicalizer.canonicalize(payload);
        } catch (SharePayloadCanonicalizer.PayloadNotObjectException exception) {
            throw new ShareLinkException(ShareLinkErrorCode.PAYLOAD_NOT_OBJECT);
        } catch (SharePayloadCanonicalizer.PayloadTooLargeException exception) {
            throw new ShareLinkException(ShareLinkErrorCode.PAYLOAD_TOO_LARGE);
        }
    }

    /**
     * 충돌하지 않는 공유 코드를 얻는다.
     *
     * <p>루프 안에서 조회를 부르지만 N+1 이 아니다. 항목 수만큼 도는 게 아니라 충돌했을 때만
     * 다시 도는 재시도이고, 상한이 있어 최악의 경우도 {@code MAX_CODE_GENERATION_RETRY} 번이다.
     */
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
}
