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
    SOCIAL_ACCOUNT_PASSWORD_UNSUPPORTED("MEMBER_007", "소셜 로그인 계정은 비밀번호를 사용하지 않습니다.", HttpStatus.BAD_REQUEST),

    // 요청 검증(Bean Validation) 전용 코드 — 1xx 대역. DTO 메시지의 "CODE:메시지" 접두어와 짝을 이룬다.
    INVALID_REQUEST("MEMBER_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    EMAIL_REQUIRED("MEMBER_101", "이메일은 필수입니다.", HttpStatus.BAD_REQUEST),
    EMAIL_FORMAT_INVALID("MEMBER_102", "이메일 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PASSWORD_REQUIRED("MEMBER_103", "비밀번호는 필수입니다.", HttpStatus.BAD_REQUEST),
    PASSWORD_LENGTH_INVALID("MEMBER_104", "비밀번호는 8자 이상 20자 이하여야 합니다.", HttpStatus.BAD_REQUEST),
    PASSWORD_PATTERN_INVALID("MEMBER_105", "비밀번호는 공백 없이 영문자, 숫자, 특수문자를 포함해야 합니다.", HttpStatus.BAD_REQUEST),
    NAME_REQUIRED("MEMBER_106", "이름은 필수입니다.", HttpStatus.BAD_REQUEST),
    NAME_LENGTH_INVALID("MEMBER_107", "이름은 10자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    NICKNAME_REQUIRED("MEMBER_108", "닉네임은 필수입니다.", HttpStatus.BAD_REQUEST),
    NICKNAME_LENGTH_INVALID("MEMBER_109", "닉네임은 10자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    PROFILE_IMAGE_URL_LENGTH_INVALID("MEMBER_110", "프로필 이미지 URL은 255자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    CURRENT_PASSWORD_REQUIRED("MEMBER_111", "현재 비밀번호는 필수입니다.", HttpStatus.BAD_REQUEST),
    NEW_PASSWORD_REQUIRED("MEMBER_112", "새 비밀번호는 필수입니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("MEMBER_113", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
