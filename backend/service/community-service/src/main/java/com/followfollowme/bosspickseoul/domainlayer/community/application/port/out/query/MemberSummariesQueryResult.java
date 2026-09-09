package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query;

import java.util.List;

/**
 * auth-service 회원 요약 응답 계약. 커뮤니티가 필요로 하는 필드만 정의하며,
 * 필드명은 auth-service 의 MemberSummariesResponse 와 일치해야 한다 (Feign 역직렬화 계약).
 *
 * <p>GET /api/v1/members/summaries?memberIds=... — 요청한 ID 중 존재하는 회원만 담긴다.
 * 탈퇴 회원은 auth 저장 시점에 마스킹된 닉네임("탈퇴회원")으로 내려온다.
 */
public record MemberSummariesQueryResult(List<MemberSummaryQueryResult> members) {

    public record MemberSummaryQueryResult(String memberId, String nickname, String profileImageUrl) {
    }
}
