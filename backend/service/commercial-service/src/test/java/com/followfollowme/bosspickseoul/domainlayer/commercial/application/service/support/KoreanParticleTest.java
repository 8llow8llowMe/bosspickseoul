package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class KoreanParticleTest {

    @Test
    @DisplayName("받침이 있으면 '을'을 고른다")
    void choosesEulForFinalConsonant() {
        assertThat(KoreanParticle.objectParticle("기회도 높음")).isEqualTo("을");
        assertThat(KoreanParticle.objectParticle("혼잡도 낮음")).isEqualTo("을");
        assertThat(KoreanParticle.objectParticle("거주 수요 보통")).isEqualTo("을");
    }

    @Test
    @DisplayName("받침이 없으면 '를'을 고른다")
    void choosesReulWithoutFinalConsonant() {
        assertThat(KoreanParticle.objectParticle("기회도")).isEqualTo("를");
        assertThat(KoreanParticle.objectParticle("거주 수요")).isEqualTo("를");
    }

    /** 읽는 방식이 사람마다 달라 받침을 단정할 수 없다 — 받침이 없는 쪽으로 둔다. */
    @Test
    @DisplayName("한글이 아닌 끝글자·빈 값은 '를'로 둔다")
    void fallsBackForNonHangul() {
        assertThat(KoreanParticle.objectParticle("score")).isEqualTo("를");
        assertThat(KoreanParticle.objectParticle("3")).isEqualTo("를");
        assertThat(KoreanParticle.objectParticle("")).isEqualTo("를");
        assertThat(KoreanParticle.objectParticle(null)).isEqualTo("를");
    }
}
