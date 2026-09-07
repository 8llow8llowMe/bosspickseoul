package com.followfollowme.bosspickseoul.common.util;

/**
 * 앞말의 받침에 따라 한국어 조사를 골라 붙인다.
 *
 * <p>사용자에게 보이는 문장을 코드에서 조립할 때, 앞말이 데이터에서 오면 조사를 상수로 둘 수 없다.
 * `"%s를"` 처럼 박아 두면 앞말이 받침으로 끝나는 순간 비문이 된다("기회도 높음를").
 *
 * <p>한글 음절은 유니코드 `AC00~D7A3` 에 초성×중성×종성 순서로 배열돼 있어,
 * `(코드 - 0xAC00) % 28` 이 0 이 아니면 종성(받침)이 있다.
 */
public final class KoreanJosa {

    private static final char HANGUL_SYLLABLE_FIRST = '가';
    private static final char HANGUL_SYLLABLE_LAST = '힣';

    /** 한글 음절 하나가 가질 수 있는 종성의 가짓수 (없음 포함). */
    private static final int JONGSUNG_COUNT = 28;

    private KoreanJosa() {
    }

    /**
     * 목적격 조사(을/를)를 붙인다.
     *
     * @param word 조사를 붙일 말. null 이거나 공백뿐이면 빈 문자열을 돌려준다 — 붙일 말이 없으면 조사도 없다.
     */
    public static String appendObjective(String word) {
        return append(word, "을", "를");
    }

    /**
     * 주격 조사(이/가)를 붙인다.
     *
     * @param word 조사를 붙일 말. null 이거나 공백뿐이면 빈 문자열을 돌려준다.
     */
    public static String appendSubjective(String word) {
        return append(word, "이", "가");
    }

    /**
     * 보조사(은/는)를 붙인다.
     *
     * @param word 조사를 붙일 말. null 이거나 공백뿐이면 빈 문자열을 돌려준다.
     */
    public static String appendTopic(String word) {
        return append(word, "은", "는");
    }

    /**
     * 마지막 글자에 받침이 있는지 본다. 한글 음절이 아니면(영문·숫자·기호) 받침이 없는 것으로 본다.
     *
     * <p>한자어가 아닌 외래어·숫자는 읽는 소리를 알아야 정확한데, 그건 발음 사전 없이는 못 한다.
     * 이 프로젝트가 조사를 붙이는 자리는 모두 한글 지표명이라 여기까지만 다룬다.
     */
    public static boolean hasFinalConsonant(String word) {
        if (word == null || word.isBlank()) {
            return false;
        }
        char last = word.charAt(word.length() - 1);
        if (last < HANGUL_SYLLABLE_FIRST || last > HANGUL_SYLLABLE_LAST) {
            return false;
        }
        return (last - HANGUL_SYLLABLE_FIRST) % JONGSUNG_COUNT != 0;
    }

    private static String append(String word, String withFinalConsonant, String withoutFinalConsonant) {
        if (word == null || word.isBlank()) {
            return "";
        }
        return word + (hasFinalConsonant(word) ? withFinalConsonant : withoutFinalConsonant);
    }
}
