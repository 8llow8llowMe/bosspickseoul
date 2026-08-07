package com.followfollowme.nowdoboss.domainlayer.sharelink.application.exception;

/**
 * 공유 링크 요청 검증 메시지 카탈로그 (SHARE_LINK_1xx).
 *
 * <p>Bean Validation의 {@code message}는 컴파일 상수만 받을 수 있어 enum을 직접 쓸 수 없다.
 * 코드와 메시지를 이 상수에 모아 DTO가 참조하게 하면, 오타나 삭제를 컴파일러가 잡고
 * 코드-메시지의 단일 기준점이 유지된다.
 *
 * <p>형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 */
public final class ShareLinkValidationMessage {

    public static final String SHARE_TYPE_REQUIRED = "SHARE_LINK_101:공유 대상 타입은 필수입니다.";
    public static final String PAYLOAD_REQUIRED = "SHARE_LINK_102:공유 데이터는 필수입니다.";

    private ShareLinkValidationMessage() {
    }
}
