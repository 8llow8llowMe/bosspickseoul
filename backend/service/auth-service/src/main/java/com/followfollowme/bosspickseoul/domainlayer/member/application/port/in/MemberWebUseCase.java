package com.followfollowme.bosspickseoul.domainlayer.member.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberProfileImageUploadResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberSummariesResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.storage.model.FileUploadCommand;
import java.util.List;

public interface MemberWebUseCase {

    void generalSignup(MemberGeneralSignupCommand command);

    MemberMyInfoResponse getMyInfo(long memberId);

    /** 내부 서비스(커뮤니티 등) 작성자 표시용 회원 요약 일괄 조회. 미존재 ID 는 결과에서 빠진다. */
    MemberSummariesResponse getMemberSummaries(List<Long> memberIds);

    MemberMyInfoResponse updateMyInfo(long memberId, String nickname);

    MemberProfileImageUploadResponse uploadProfileImage(long memberId, FileUploadCommand command);

    MemberMyInfoResponse removeProfileImage(long memberId);

    void changePassword(long memberId, String tokenId, String currentPassword, String newPassword);

    /** 소셜 전용 계정(비밀번호 없음)에 비밀번호를 최초 설정한다 — 이메일 로그인 수단 추가. */
    void setupPassword(long memberId, String newPassword);

    /** 비밀번호를 제거해 소셜 전용 계정으로 전환한다 — 소셜 연결 계정만 허용, 전 기기 세션 무효화. */
    void removePassword(long memberId, String tokenId);

    void withdraw(long memberId, String tokenId);
}
