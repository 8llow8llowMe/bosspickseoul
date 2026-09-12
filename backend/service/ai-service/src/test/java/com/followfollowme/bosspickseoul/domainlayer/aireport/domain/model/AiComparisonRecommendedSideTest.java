package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 상권 비교 우위 계약값의 경계를 고정한다.
 *
 * <p>{@code BALANCED} 는 코드베이스 어디에서도 리터럴로 등장하지 않는다. 파서 테스트와 골든 JSON 은 모두
 * {@code LEFT} 만 쓰기 때문에, commercial-service 가 {@code TIE} 를 주는 경로는 이 테스트가 없으면 무검증이다.
 * 변환이 사라지면 {@code TIE} 가 그대로 응답 계약에 실려 프론트와 LLM 스키마 검증이 동시에 깨진다.
 */
class AiComparisonRecommendedSideTest {

    @Test
    @DisplayName("원천 TIE 는 AI 리포트 계약값 BALANCED 로 옮겨진다")
    void fromUpstreamCode_tie_mapsToBalanced() {
        assertThat(AiComparisonRecommendedSide.fromUpstreamCode("TIE")).contains(AiComparisonRecommendedSide.BALANCED);
    }

    @Test
    @DisplayName("알 수 없는 원천 코드는 비어 있는 결과다 - 그대로 흘려보낼지는 호출부가 정한다")
    void fromUpstreamCode_unknown_returnsEmpty() {
        assertThat(AiComparisonRecommendedSide.fromUpstreamCode("UNKNOWN")).isEmpty();
    }

    @Test
    @DisplayName("TIE 는 LLM 응답값으로는 부적합하다 - 변환 전 코드라 계약값이 아니다")
    void isSupportedCode_tie_isFalse() {
        assertThat(AiComparisonRecommendedSide.isSupportedCode("TIE")).isFalse();
    }
}
