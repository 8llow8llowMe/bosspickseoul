package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 신고 사유 코드 (#473).
 *
 * <p>표시명은 FE 신고 다이얼로그 라벨({@code frontend/src/lib/community/report-reason.ts} 의 {@code COMMUNITY_REPORT_REASONS})과
 * <b>글자 하나까지 같아야 한다.</b> 사유 코드가 생기기 전 FE 는 고른 사유를 {@code [라벨] 상세} 접두 문자열로 보냈고, 서버는 그 라벨을
 * 이 표시명으로 되읽는다({@link #fromDisplayName}). 가운뎃점은 U+00B7 이다 — 비슷한 다른 점으로 바뀌면 레거시 해석이 조용히 ETC 로 떨어진다.
 */
@Getter
@RequiredArgsConstructor
public enum CommunityReportReasonCode implements CodeNameDescribable {

    SPAM("스팸·홍보"),
    ABUSE("욕설·비방"),
    PRIVACY("개인정보 노출"),
    FALSE_INFO("거짓 정보"),
    ETC("기타");

    private final String displayName;

    public static CommunityReportReasonCode from(String value) {
        if (value == null) {
            throw new CommunityException(CommunityErrorCode.INVALID_REPORT_REASON_CODE);
        }
        try {
            return CommunityReportReasonCode.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_REPORT_REASON_CODE);
        }
    }

    /** 표시명이 정확히 같은 코드를 찾는다. 레거시 {@code [라벨] 상세} 문자열 해석용이라 모르는 라벨은 오류가 아니라 empty 다. */
    public static Optional<CommunityReportReasonCode> fromDisplayName(String displayName) {
        return Arrays.stream(values())
            .filter(code -> code.displayName.equals(displayName))
            .findFirst();
    }
}
