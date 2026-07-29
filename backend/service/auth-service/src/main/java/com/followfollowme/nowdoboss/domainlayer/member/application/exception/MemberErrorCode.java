package com.followfollowme.nowdoboss.domainlayer.member.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MemberErrorCode {

    EXIST_MEMBER_EMAIL("MEMBER_001", "이미 가입된 이메일 (%s)입니다.", HttpStatus.CONFLICT),
    NOT_FOUND_MEMBER("MEMBER_002", "존재하지 않는 회원입니다", HttpStatus.NOT_FOUND),
    NOT_MATCH_PASSWORD("MEMBER_003", "비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST),
    MEMBER_ALREADY_WITHDRAWN("MEMBER_004", "이미 탈퇴한 회원입니다.", HttpStatus.BAD_REQUEST),
    MEMBER_SUSPENDED("MEMBER_005", "정지된 회원입니다.", HttpStatus.FORBIDDEN),
    EMAIL_NOT_VERIFIED("MEMBER_006", "이메일 인증이 완료되지 않았습니다. 인증 후 다시 시도해주세요.", HttpStatus.BAD_REQUEST),
    SOCIAL_ACCOUNT_PASSWORD_UNSUPPORTED("MEMBER_007", "소셜 로그인 계정은 비밀번호를 사용하지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
