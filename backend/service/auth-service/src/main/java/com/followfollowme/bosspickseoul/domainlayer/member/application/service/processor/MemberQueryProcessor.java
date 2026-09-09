package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberQueryProcessor {

    private static final int SUMMARIES_MAX_IDS = 100;

    private final MemberRepositoryPort memberRepositoryPort;

    public MemberMyInfo getMyInfo(long memberId) {
        Member member = getActiveMember(memberId);
        return MemberMyInfo.from(member);
    }

    /**
     * 작성자 표시용 회원 요약 일괄 조회. 미존재 ID 는 결과에서 빠지고(호출 쪽이 null 처리),
     * 탈퇴 회원은 저장 시점에 마스킹된 닉네임("탈퇴회원")이 그대로 내려가므로 상태를 거르지 않는다.
     */
    public List<MemberSummaryInfo> getSummaries(List<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            return List.of();
        }
        List<Long> distinctIds = memberIds.stream().distinct().toList();
        if (distinctIds.size() > SUMMARIES_MAX_IDS) {
            throw new MemberException(MemberErrorCode.INVALID_REQUEST);
        }
        return memberRepositoryPort.findAllByIds(distinctIds).stream()
            .map(MemberSummaryInfo::from)
            .toList();
    }

    /**
     * 활성(ACTIVE) 회원만 통과시킨다. 탈퇴/정지 회원의 만료 전 토큰으로
     * 회원 스코프 API에 접근하는 것을 막기 위한 공통 검증이다.
     */
    public Member getActiveMember(long memberId) {
        Member member = memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER));

        switch (member.status()) {
            case WITHDRAWN -> throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            case SUSPENDED -> throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            case ACTIVE -> {
            } // 정상
        }
        return member;
    }
}
