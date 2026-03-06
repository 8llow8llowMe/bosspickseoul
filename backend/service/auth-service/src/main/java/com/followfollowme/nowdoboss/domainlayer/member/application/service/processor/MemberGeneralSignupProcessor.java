package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberStatus;
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
                    case ACTIVE -> new MemberException(MemberErrorCode.EXIST_MEMBER_EMAIL, email);
                    case WITHDRAWN -> new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN, email);
                    case SUSPENDED -> new MemberException(MemberErrorCode.MEMBER_SUSPENDED, email);
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
