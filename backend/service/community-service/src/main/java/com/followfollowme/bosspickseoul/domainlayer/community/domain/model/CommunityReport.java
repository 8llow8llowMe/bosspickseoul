package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import java.time.LocalDateTime;

/**
 * 커뮤니티 신고.
 *
 * <p>{@code reason} 은 사유 코드(#473) 이전부터 있던 「레거시 사유 원문」이다 — deprecated, 후속 정리 대상.
 * 사유는 {@code reasonCode}(항상 있음)와 {@code detail}(없으면 null)로 읽는다. 채우는 규칙은 {@link CommunityReportReason}.
 */
public record CommunityReport(
    long id,
    CommunityReportTargetKind targetKind,
    long targetId,
    long reporterMemberId,
    String reason,
    CommunityReportReasonCode reasonCode,
    String detail,
    LocalDateTime createdAt,
    ReportStatus status,
    LocalDateTime resolvedAt,
    Long resolvedByMemberId
) {
}
