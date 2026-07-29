package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class GeneralLoginProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;
    // 미존재 이메일에도 bcrypt를 1회 수행해 응답 시간으로 계정 존재 여부가 드러나지 않게 한다.
    private final String timingEqualizerHash;

    public GeneralLoginProcessor(MemberRepositoryPort memberRepositoryPort, PasswordEncoder passwordEncoder) {
        this.memberRepositoryPort = memberRepositoryPort;
        this.passwordEncoder = passwordEncoder;
        this.timingEqualizerHash = passwordEncoder.encode("timing-equalizer-placeholder");
    }

    public GeneralLoginInfo generalLogin(AuthGeneralLoginCommand command) {
        // 1. 회원 조회 (미존재도 LOGIN_FAILED로 응답해 계정 존재 여부를 노출하지 않는다)
        Member member = memberRepositoryPort.findByEmail(command.email())
            .orElseThrow(() -> {
                passwordEncoder.matches(command.password(), timingEqualizerHash);
                return new AuthException(AuthErrorCode.LOGIN_FAILED);
            });

        // 2. 비밀번호를 먼저 검증하고, 상태(탈퇴/정지)는 비밀번호가 맞을 때만 노출한다.
        validatePassword(command.password(), member.password());
        validateMemberStatus(member);

        // 3. 로그인 정보 반환
        return GeneralLoginInfo.of(member.id(), member.role());
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
        // 소셜 확장 대비 password nullable — 비밀번호가 없는 계정도 동일하게 LOGIN_FAILED로 응답한다.
        if (encodedPassword == null || !passwordEncoder.matches(rawPassword, encodedPassword)) {
            throw new AuthException(AuthErrorCode.LOGIN_FAILED);
        }
    }
}
