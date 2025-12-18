package com.followfollowme.nowdoboss.domainlayer.member.application.service;

import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberGeneralSignupProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberFacade implements MemberWebUseCase {

    private final MemberGeneralSignupProcessor memberGeneralSignupProcessor;

    @Override
    @Transactional
    public void generalSignup(MemberSignupCommand command) {
        memberGeneralSignupProcessor.generalSignup(command);
    }
}
