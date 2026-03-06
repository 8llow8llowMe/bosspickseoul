package com.followfollowme.nowdoboss.domainlayer.member.application.service;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.presenter.MemberPresenter;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberGeneralSignupProcessor;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberWebFacade implements MemberWebUseCase {

    private final MemberGeneralSignupProcessor memberGeneralSignupProcessor;
    private final MemberQueryProcessor memberQueryProcessor;
    private final MemberPresenter memberPresenter;

    @Override
    @Transactional
    public void generalSignup(MemberGeneralSignupCommand command) {
        memberGeneralSignupProcessor.generalSignup(command);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberMyInfoResponse getMyInfo(long memberId) {
        MemberMyInfo memberMyInfo = memberQueryProcessor.getMyInfo(memberId);
        return memberPresenter.toMyInfoResponse(memberMyInfo);
    }
}
