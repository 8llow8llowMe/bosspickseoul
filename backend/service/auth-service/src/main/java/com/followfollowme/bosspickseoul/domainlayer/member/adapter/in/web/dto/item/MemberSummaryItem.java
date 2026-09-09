package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "회원 요약 항목 DTO — 작성자 표시용 (내부 서비스 전용)")
public record MemberSummaryItem(

    @Schema(description = "회원 ID")
    String memberId,

    @Schema(description = "닉네임 (탈퇴 회원은 '탈퇴회원')")
    String nickname,

    @Schema(description = "프로필 이미지 URL", nullable = true)
    String profileImageUrl
) {

}
