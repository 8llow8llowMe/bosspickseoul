package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberCommandProcessor {

    private final MemberQueryProcessor memberQueryProcessor;
    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public void withdraw(long memberId) {
        Member member = memberQueryProcessor.getActiveMember(memberId);
        memberRepositoryPort.save(member.withdraw());
    }

    public MemberMyInfo updateMyInfo(long memberId, String nickname, String profileImageUrl) {
        Member member = memberQueryProcessor.getActiveMember(memberId);
        Member updated = memberRepositoryPort.save(member.updateProfile(nickname, profileImageUrl));
        return MemberMyInfo.from(updated);
    }

    public void changePassword(long memberId, String currentPassword, String newPassword) {
        Member member = memberQueryProcessor.getActiveMember(memberId);

        if (member.password() == null || !passwordEncoder.matches(currentPassword, member.password())) {
            throw new MemberException(MemberErrorCode.NOT_MATCH_PASSWORD);
        }

        memberRepositoryPort.save(member.changePassword(passwordEncoder.encode(newPassword)));
    }
}
