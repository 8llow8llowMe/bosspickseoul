package com.followfollowme.nowdoboss.domainlayer.member.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;

public interface MemberWebUseCase {

    void generalSignup(MemberGeneralSignupCommand command);

    MemberMyInfoResponse getMyInfo(long memberId);

    MemberMyInfoResponse updateMyInfo(long memberId, String nickname, String profileImageUrl);

    void changePassword(long memberId, String tokenId, String currentPassword, String newPassword);

    void withdraw(long memberId, String tokenId);
}
