package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command.AnalysisBookmarkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkDuplicateException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.support.SharePayloadCanonicalizer;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.global.properties.AnalysisBookmarkProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분석 화면 보관함 저장/이름 수정/삭제.
 * payload 정규화와 해시는 공유 링크와 같은 SharePayloadCanonicalizer 를 사용해,
 * 같은 화면 상태는 항상 같은 해시가 되고 회원별 중복 저장을 막을 수 있다.
 */
@Component
@RequiredArgsConstructor
public class AnalysisBookmarkCommandProcessor {

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final AnalysisBookmarkRepositoryPort analysisBookmarkRepositoryPort;
    private final SharePayloadCanonicalizer sharePayloadCanonicalizer;
    private final AnalysisBookmarkProperties analysisBookmarkProperties;

    /**
     * 동시 저장 경합으로 중복 검사를 둘 다 통과한 경우는 DB 유니크 제약이 막고,
     * CommercialExceptionHandler 가 해당 위반을 동일한 409 로 변환한다.
     */
    @Transactional
    public AnalysisBookmark create(long memberId, AnalysisBookmarkCreateCommand command) {
        ShareTargetType shareType = parseShareType(command.shareType());
        String canonicalPayload = canonicalize(command.payload());
        String payloadHash = sharePayloadCanonicalizer.payloadHash(shareType, canonicalPayload);

        analysisBookmarkRepositoryPort.findByMemberIdAndPayloadHash(memberId, payloadHash)
            .ifPresent(existing -> {
                throw new AnalysisBookmarkDuplicateException(existing.id());
            });
        if (analysisBookmarkRepositoryPort.countByMemberId(memberId) >= analysisBookmarkProperties.maxPerMember()) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.BOOKMARK_LIMIT_EXCEEDED);
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

    // 소유자 조건을 쿼리에 포함해 단일 쿼리로 처리한다. 타인 항목은 존재 여부를 노출하지 않도록 동일하게 404.
    @Transactional
    public void delete(long memberId, long bookmarkId) {
        if (analysisBookmarkRepositoryPort.deleteByIdAndMemberId(bookmarkId, memberId) == 0) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
        }
    }

    @Transactional
    public void updateBookmarkName(long memberId, long bookmarkId, String bookmarkName) {
        String normalized = normalizeBookmarkName(bookmarkName);
        if (analysisBookmarkRepositoryPort.updateBookmarkName(bookmarkId, memberId, normalized) == 0) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
        }
    }

    private ShareTargetType parseShareType(String value) {
        return ShareTargetType.parse(value)
            .orElseThrow(() -> new AnalysisBookmarkException(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE));
    }

    private String canonicalize(JsonNode payload) {
        try {
            return sharePayloadCanonicalizer.canonicalize(payload);
        } catch (SharePayloadCanonicalizer.PayloadNotObjectException exception) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.PAYLOAD_NOT_OBJECT);
        } catch (SharePayloadCanonicalizer.PayloadTooLargeException exception) {
            throw new AnalysisBookmarkException(AnalysisBookmarkErrorCode.PAYLOAD_TOO_LARGE);
        }
    }

    private String normalizeBookmarkName(String bookmarkName) {
        return bookmarkName == null || bookmarkName.isBlank() ? null : bookmarkName.trim();
    }
}
