package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign.CommunityMemberClient;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.MemberSummaryQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 작성자 표시용 회원 요약을 회원 데이터의 원천인 auth-service 실조회로 가져온다.
 * 커뮤니티는 닉네임을 스냅샷으로 소유하지 않는다 — 닉네임 변경/탈퇴 마스킹이 지연 없이 반영되고,
 * 회원 데이터 이중 관리로 인한 불일치를 만들지 않기 위해서다 (지역 메타와 같은 원칙).
 */
@Component
@RequiredArgsConstructor
public class CommunityMemberSummaryClientAdapter implements MemberSummaryQueryPort {

    private final CommunityMemberClient communityMemberClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public Map<Long, MemberSummaryQueryResult> findSummaries(Collection<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            return Map.of();
        }
        MemberSummariesQueryResult result = responseSupport.requestAndUnwrap(
            InternalResponseSupport.AUTH_SERVICE,
            () -> communityMemberClient.getMemberSummaries(memberIds.stream().distinct().toList()),
            CommunityErrorCode.MEMBER_SERVICE_UNAVAILABLE
        );
        if (result == null || result.members() == null) {
            return Map.of();
        }
        return result.members().stream()
            .collect(Collectors.toMap(
                summary -> Long.parseLong(summary.memberId()),
                Function.identity(),
                (first, second) -> first));
    }
}
