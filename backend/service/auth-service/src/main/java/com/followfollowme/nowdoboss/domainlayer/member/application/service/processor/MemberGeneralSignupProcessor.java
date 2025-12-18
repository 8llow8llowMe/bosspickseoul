package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.enums.MemberStatus;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberGeneralSignupProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public void signup(MemberSignupCommand command) {
        memberRepositoryPort.findByEmail(command.email())
            .ifPresent(existing -> {
                switch (existing.status()) {
                    case ACTIVE -> throw new IllegalArgumentException("이미 가입된 이메일 (%s) 입니다.");
                    case WITHDRAWN -> throw new IllegalArgumentException("이미 탈퇴한 회원입니다.");
                    case SUSPENDED -> throw new IllegalArgumentException("정지된 회원입니다.");
                }
            });

        Member member = Member.builder()
            .id(snowflakeIdGenerator.generateId())
            .email(command.email())
            .password(passwordEncoder.encode(command.password()))
            .name(command.name())
            .nickname(command.nickname())
            .profileImageUrl(null)
            .status(MemberStatus.ACTIVE)
            .build();

        memberRepositoryPort.save(member);
    }
}
