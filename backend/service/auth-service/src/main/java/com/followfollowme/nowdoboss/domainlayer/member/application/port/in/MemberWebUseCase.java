package com.followfollowme.nowdoboss.domainlayer.member.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberProfileImageUploadResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.storage.model.FileUploadCommand;

public interface MemberWebUseCase {

    void generalSignup(MemberGeneralSignupCommand command);

    MemberMyInfoResponse getMyInfo(long memberId);

    MemberMyInfoResponse updateMyInfo(long memberId, String nickname);

    MemberProfileImageUploadResponse uploadProfileImage(long memberId, FileUploadCommand command);

    MemberMyInfoResponse removeProfileImage(long memberId);

    void changePassword(long memberId, String tokenId, String currentPassword, String newPassword);

    void withdraw(long memberId, String tokenId);
}
