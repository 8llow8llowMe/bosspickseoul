package com.followfollowme.nowdoboss.domainlayer.member.application.service;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.presenter.MemberPresenter;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberSessionRevokePort;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberCommandProcessor;
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
    private final MemberCommandProcessor memberCommandProcessor;
    private final MemberSessionRevokePort memberSessionRevokePort;
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

    @Override
    @Transactional
    public MemberMyInfoResponse updateMyInfo(long memberId, String nickname, String profileImageUrl) {
        MemberMyInfo memberMyInfo = memberCommandProcessor.updateMyInfo(memberId, nickname, profileImageUrl);
        return memberPresenter.toMyInfoResponse(memberMyInfo);
    }

    @Override
    @Transactional
    public void changePassword(long memberId, String tokenId, String currentPassword, String newPassword) {
        // 1. 비밀번호 변경
        memberCommandProcessor.changePassword(memberId, currentPassword, newPassword);

        // 2. 세션 무효화 (refresh 삭제 + 현재 access 블랙리스트).
        //    실패 시 예외가 전파되어 비밀번호 변경도 함께 롤백된다 — 무효화 없는 성공을 만들지 않는다.
        memberSessionRevokePort.revokeAllSessions(memberId, tokenId);
    }

    @Override
    @Transactional
    public void withdraw(long memberId, String tokenId) {
        // 1. 논리 탈퇴 (상태 전이 + 개인정보 마스킹)
        memberCommandProcessor.withdraw(memberId);

        // 2. 세션 무효화 — 실패 시 탈퇴도 함께 롤백된다.
        memberSessionRevokePort.revokeAllSessions(memberId, tokenId);
    }
}
