package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.enums.MemberStatus;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberGeneralSignupProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public void generalSignup(MemberGeneralSignupCommand command) {
        // 1. 이메일 중복 검증
        validateEmailNotExists(command.email());

        // 2. 회원 생성 및 저장
        Member member = createMember(command);
        memberRepositoryPort.save(member);
    }

    private void validateEmailNotExists(String email) {
        memberRepositoryPort.findByEmail(email)
            .ifPresent(existing -> {
                throw switch (existing.status()) {
                    case ACTIVE -> new IllegalArgumentException(
                        String.format("이미 가입된 이메일 (%s) 입니다.", email)
                    );
                    case WITHDRAWN -> new IllegalArgumentException("이미 탈퇴한 회원입니다.");
                    case SUSPENDED -> new IllegalArgumentException("정지된 회원입니다.");
                };
            });
    }

    private Member createMember(MemberGeneralSignupCommand command) {
        return Member.builder()
            .id(snowflakeIdGenerator.generateId())
            .email(command.email())
            .password(passwordEncoder.encode(command.password()))
            .name(command.name())
            .nickname(command.nickname())
            .profileImageUrl(null)
            .role(SecurityRole.USER)
            .status(MemberStatus.ACTIVE)
            .build();
    }
}
