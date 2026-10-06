package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 신고 요청에서 저장할 사유를 정한 결과 (#473).
 *
 * <ul>
 *   <li>{@code code} — 사유 코드. 항상 있다.</li>
 *   <li>{@code detail} — 상세 내용. 없으면 null.</li>
 *   <li>{@code legacyReason} — 기존 {@code community_report.reason} 컬럼(NOT NULL)에 넣을 「레거시 사유 원문」. 레거시 요청은 받은 문자열 그대로,
 *       신규 요청은 상세가 있으면 상세, 없으면 코드 표시명. 컬럼 정리(후속) 전까지 이전 버전·운영 조회가 읽을 수 있게 채워 둔다.</li>
 * </ul>
 *
 * <p>사유 코드가 있으면 신규 요청이고 {@code reason} 은 무시한다. 없으면 레거시 요청이다 — FE(#456)는 사유 코드가 없을 때
 * 고른 사유를 {@code [라벨] 상세} 접두 문자열로 보냈다. 라벨이 코드 표시명이면 그 코드로, 접두가 없거나 모르는 라벨이면 ETC 에 원문 전체를 상세로 둔다.
 * 레거시 경로에는 「ETC 는 상세 필수」를 강제하지 않는다(옛 클라이언트를 깨지 않는다). 신규 경로의 그 규칙은 요청 DTO 검증(COMMUNITY_123)이 맡는다.
 */
public record CommunityReportReason(CommunityReportReasonCode code, String detail, String legacyReason) {

    /** {@code [라벨]} 뒤에 공백(없어도 됨)과 상세가 온다. 상세는 줄바꿈을 포함할 수 있다. */
    private static final Pattern LEGACY_PREFIX = Pattern.compile("^\\[([^\\]]+)\\]\\s*(.*)$", Pattern.DOTALL);

    /**
     * @param reasonCode 신규 사유 코드 문자열 (null/blank 면 레거시 요청) — 잘못된 값은 COMMUNITY_018
     * @param detail     신규 요청의 상세 (trim, blank 면 null)
     * @param reason     레거시 사유 문자열 (reasonCode 가 없을 때만 쓴다)
     */
    public static CommunityReportReason resolve(String reasonCode, String detail, String reason) {
        // 빈 값 판단은 요청 DTO 검증(CommunityReportCreateRequest.hasContent)과 같은 trim 기준이다 — 제어문자만 있으면 없는 것으로 본다.
        if (blankToNull(reasonCode) != null) {
            return ofCode(CommunityReportReasonCode.from(reasonCode), detail);
        }
        return fromLegacy(reason);
    }

    private static CommunityReportReason ofCode(CommunityReportReasonCode code, String detail) {
        String normalizedDetail = blankToNull(detail);
        return new CommunityReportReason(code, normalizedDetail, normalizedDetail != null ? normalizedDetail : code.getDisplayName());
    }

    private static CommunityReportReason fromLegacy(String reason) {
        // 요청 DTO 검증(COMMUNITY_110)이 reasonCode·reason 중 하나를 보장한다. 여기까지 둘 다 없이 오면 호출 쪽 버그다.
        if (blankToNull(reason) == null) {
            throw new IllegalArgumentException("reasonCode or reason is required");
        }

        String trimmed = reason.trim();
        Matcher matcher = LEGACY_PREFIX.matcher(trimmed);
        if (matcher.matches()) {
            Optional<CommunityReportReasonCode> labeled = CommunityReportReasonCode.fromDisplayName(matcher.group(1));
            if (labeled.isPresent()) {
                return new CommunityReportReason(labeled.get(), blankToNull(matcher.group(2)), trimmed);
            }
        }
        return new CommunityReportReason(CommunityReportReasonCode.ETC, trimmed, trimmed);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
