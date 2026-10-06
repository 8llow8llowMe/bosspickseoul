package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;

/**
 * 신고 등록 명령. 사유 세 필드는 요청 문자열 그대로다 — 어떤 사유로 저장할지는 Processor 가
 * {@code CommunityReportReason.resolve} 로 정한다(신규 reasonCode + detail, 없으면 레거시 reason).
 */
public record CreateReportCommand(

    CommunityReportTargetKind targetKind,

    long targetId,

    String reasonCode,

    String detail,

    String reason

) {

}
