package com.followfollowme.bosspickseoul.common.util;

/**
 * 응답으로 내려가는 식별자를 문자열로 바꾼다.
 *
 * <p><b>왜 필요한가.</b> JavaScript 의 수 표현 한계(`Number.MAX_SAFE_INTEGER` = 9007199254740991)를
 * 넘는 정수는 JSON 파싱 시점에 뒷자리가 소리 없이 날아간다. 우리 Snowflake ID 는
 * {@code (timestamp - epoch) << 22} 라 현재 약 7.5e17 이고, 이 한계를 두 자릿수 넘는다.
 * 즉 서로 다른 ID 여러 개가 프론트에서 같은 값으로 보인다. 오류가 아니라 조용한 오염이라
 * 상세 조회·좋아요·삭제가 엉뚱한 대상에 걸려도 원인을 찾기 어렵다.
 *
 * <p><b>왜 전부 바꾸는가.</b> auto-increment 로 만들어 지금은 한계 안에 있는 식별자도 함께
 * 문자열로 내린다. 같은 "아이디"인데 어떤 건 숫자, 어떤 건 문자열이면 프론트가 필드마다
 * 다르게 다뤄야 하고, 나중에 생성 전략이 바뀌면 조용히 깨진다. 규칙은 하나여야 한다.
 *
 * <p>서버 안에서는 계속 {@code long} 을 쓴다. 경계를 넘는 순간(Presenter)에만 문자열로 바꾼다.
 * 요청으로 들어오는 값은 Jackson 과 Spring 이 문자열을 {@code long} 으로 알아서 바꿔주므로
 * 별도 처리가 필요 없다.
 */
public final class ResponseId {

    private ResponseId() {
    }

    /**
     * null 이면 null 을 그대로 돌려준다. 없는 식별자를 {@code "0"} 이나 {@code "null"} 같은
     * 문자열로 만들면 프론트가 존재하는 값으로 오해한다.
     */
    public static String of(Long id) {
        return id == null ? null : id.toString();
    }
}
