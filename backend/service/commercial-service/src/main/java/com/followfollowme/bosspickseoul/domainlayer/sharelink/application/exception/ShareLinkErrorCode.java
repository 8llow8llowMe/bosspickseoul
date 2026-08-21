package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ShareLinkErrorCode {

    SHARE_LINK_NOT_FOUND("SHARE_LINK_001", "공유 링크를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    SHARE_LINK_EXPIRED("SHARE_LINK_002", "만료된 공유 링크입니다.", HttpStatus.GONE),
    INVALID_SHARE_TARGET_TYPE("SHARE_LINK_003", "유효하지 않은 공유 대상 타입입니다.", HttpStatus.BAD_REQUEST),
    PAYLOAD_NOT_OBJECT("SHARE_LINK_004", "공유 데이터는 JSON 객체 형식이어야 합니다.", HttpStatus.BAD_REQUEST),
    PAYLOAD_TOO_LARGE("SHARE_LINK_005", "공유 데이터가 허용 크기를 초과했습니다.", HttpStatus.BAD_REQUEST),
    SHARE_CODE_GENERATION_FAILED("SHARE_LINK_006", "공유 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", HttpStatus.INTERNAL_SERVER_ERROR);

    // 요청 검증(Bean Validation) 필드별 코드(SHARE_LINK_101~)는 ShareLinkValidationMessage 가 단일 기준점이며,
    // 여기서는 중복 정의하지 않는다. 검증 폴백/타입 불일치는 서비스 공통 CommercialErrorCode 1xx 를 사용한다.

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
