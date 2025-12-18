package com.followfollowme.nowdoboss.domainlayer.member.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberSignupCommand;

public interface MemberWebUseCase {

    void generalSignup(MemberSignupCommand command);
}
