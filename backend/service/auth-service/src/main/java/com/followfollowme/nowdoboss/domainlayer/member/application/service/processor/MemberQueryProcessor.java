package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberQueryProcessor {

    private final MemberRepositoryPort memberRepositoryPort;

    public MemberMyInfo getMyInfo(long memberId) {
        Member member = findMemberById(memberId);
        return MemberMyInfo.from(member);
    }

    private Member findMemberById(Long memberId) {
        return memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new IllegalArgumentException(
                String.format("존재하지 않는 회원입니다. (memberId: %d)", memberId)
            ));
    }
}
