package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.support;

/**
 * 한국어 조사를 앞말에 맞춰 고른다.
 *
 * <p><b>왜 필요한가.</b> 문장을 {@code "%s를 우선 반영했고"} 처럼 조사까지 박아 두면, 앞자리에
 * 들어오는 값이 받침으로 끝나는 순간 「기회도 높음<b>를</b>」 같은 비문이 사용자 화면에 그대로
 * 나간다. 상권 추천 카드의 추천 이유가 실제로 그랬다. 값이 데이터에서 오는 자리에서는 조사를
 * 상수로 둘 수 없다.
 *
 * <p><b>판정 방법.</b> 한글 음절은 유니코드 AC00~D7A3 구간에 초성·중성·종성 순으로 배열돼 있어
 * {@code (코드 - 0xAC00) % 28} 이 0 이면 종성(받침)이 없다. 마지막 글자만 보면 된다.
 *
 * <p><b>한글이 아닌 끝글자.</b> 숫자·영문으로 끝나는 값은 읽는 방식이 사람마다 달라(예: 3 → 삼/three)
 * 받침을 단정할 수 없다. 그 경우 받침이 없는 쪽(를/가)을 쓴다 — 지금 이 유틸을 쓰는 자리의 값은
 * 전부 한글 지표명이라 실제로 걸리지 않지만, 조용히 틀리기보다 규칙을 적어 둔다.
 */
public final class KoreanParticle {

    private static final char HANGUL_SYLLABLE_FIRST = 0xAC00;
    private static final char HANGUL_SYLLABLE_LAST = 0xD7A3;
    private static final int JONGSEONG_COUNT = 28;

    private KoreanParticle() {
    }

    /** 목적격 조사. 받침이 있으면 "을", 없으면 "를". */
    public static String objectParticle(String word) {
        return hasFinalConsonant(word) ? "을" : "를";
    }

    private static boolean hasFinalConsonant(String word) {
        if (word == null || word.isEmpty()) {
            return false;
        }

        char last = word.charAt(word.length() - 1);
        if (last < HANGUL_SYLLABLE_FIRST || last > HANGUL_SYLLABLE_LAST) {
            return false;
        }

        return (last - HANGUL_SYLLABLE_FIRST) % JONGSEONG_COUNT != 0;
    }
}
