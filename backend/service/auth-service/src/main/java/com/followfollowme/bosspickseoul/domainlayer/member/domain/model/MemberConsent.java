package com.followfollowme.bosspickseoul.domainlayer.member.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import java.time.LocalDateTime;
import lombok.Builder;

/**
 * 동의 이력 한 줄. 한 번 남기면 고치지 않는다 — "그때 무엇에 동의했는가"가 증거라서, 문서가 개정되면
 * 갱신이 아니라 새 행을 쌓는다.
 *
 * <p>{@code documentVersion} 을 함께 남기는 이유가 여기 있다. 시각만 남기면 개정 이력을 배포 시각으로
 * 거슬러 대조해야 하고, 그 대조는 틀리기 쉽다.
 */
@Builder
public record MemberConsent(
    long id,
    long memberId,
    MemberConsentType consentType,
    String documentVersion,
    LocalDateTime agreedAt
) {

    /**
     * 문서 판 문자열의 최대 길이 ({@code member_consent.document_version} 컬럼 길이). 엔티티 컬럼 정의와
     * {@code LegalProperties} 의 기동 검사가 함께 이 값을 본다 — 판 설정이 이보다 길면 기동은 되고 모든 가입이
     * INSERT 에서 실패하므로, 기동 단계에서 막는다.
     */
    public static final int DOCUMENT_VERSION_MAX_LENGTH = 20;
}
