package com.followfollowme.nowdoboss.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MemberErrorCode {

    EXIST_MEMBER_EMAIL("MEMBER_001", "이미 가입된 이메일 (%s)입니다.", HttpStatus.CONFLICT),
    NOT_FOUND_MEMBER("MEMBER_002", "존재하지 않는 회원입니다", HttpStatus.NOT_FOUND),
    NOT_MATCH_PASSWORD("MEMBER_003", "비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST),
    UPLOAD_PROFILE_IMAGE_FAILED("MEMBER_004", "프로필 이미지 업로드에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    MEMBER_NOT_WITHDRAWN("MEMBER_005", "탈퇴한 회원이 아닙니다.", HttpStatus.BAD_REQUEST),
    MEMBER_ALREADY_WITHDRAWN("MEMBER_006", "이미 탈퇴한 회원입니다.", HttpStatus.BAD_REQUEST),
    MEMBER_SUSPENDED("MEMBER_007", "정지된 회원입니다.", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
