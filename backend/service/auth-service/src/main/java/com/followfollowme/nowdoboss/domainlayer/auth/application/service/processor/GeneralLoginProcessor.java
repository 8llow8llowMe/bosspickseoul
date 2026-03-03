package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GeneralLoginProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public GeneralLoginInfo generalLogin(AuthGeneralLoginCommand command) {
        // 1. 회원 조회
        Member member = findMemberByEmail(command.email());

        // 2. 회원 상태 및 비밀번호 검증
        validateMemberStatus(member);
        validatePassword(command.password(), member.password());

        // 3. 로그인 정보 반환
        return GeneralLoginInfo.of(member.id(), member.role());
    }

    private Member findMemberByEmail(String email) {
        return memberRepositoryPort.findByEmail(email)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER, email));
    }

    private void validateMemberStatus(Member member) {
        switch (member.status()) {
            case WITHDRAWN -> throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            case SUSPENDED -> throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            case ACTIVE -> {
            } // 정상
        }
    }

    private void validatePassword(String rawPassword, String encodedPassword) {
        if (!passwordEncoder.matches(rawPassword, encodedPassword)) {
            throw new MemberException(MemberErrorCode.NOT_MATCH_PASSWORD);
        }
    }
}
