package com.followfollowme.bosspickseoul.domainlayer.member.application.service;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberDevSignupResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.in.MemberDevSignupUseCase;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberGeneralSignupProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 개발/테스트 전용 — prod 프로필에서는 빈이 등록되지 않는다.
 */
@Profile("!prod")
@Service
@RequiredArgsConstructor
public class MemberDevSignupFacade implements MemberDevSignupUseCase {

    private final MemberGeneralSignupProcessor memberGeneralSignupProcessor;

    @Override
    @Transactional
    public MemberDevSignupResponse devSignup(MemberGeneralSignupRequest request) {
        Member member = memberGeneralSignupProcessor.devSignup(MemberGeneralSignupCommand.from(request));
        return MemberDevSignupResponse.builder()
            .memberId(String.valueOf(member.id()))
            .email(member.email())
            .build();
    }
}
