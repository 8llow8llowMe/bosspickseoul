package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * 상권 비교 AI 인사이트가 추천하는 쪽.
 *
 * <p><b>commercial-service 의 {@code ComparisonWinnerSide} 를 공유하지 않는 이유</b>: 그쪽 값은
 * {@code LEFT / RIGHT / TIE} 인데 AI 리포트가 외부로 내보내는 계약값은 {@code LEFT / RIGHT / BALANCED} 다.
 * 타입을 공유하면 {@code TIE} 가 그대로 응답에 실려 프론트 계약과 LLM 스키마 검증
 * ({@code AiStructuredResponseParser}) 이 동시에 깨진다. 이름이 비슷하다고 합치면 안 되는 사례라
 * ai-service 안에 별도로 둔다. 두 서비스는 모듈 의존도 없다.
 */
public enum AiComparisonRecommendedSide {

    LEFT,
    RIGHT,
    /** 원천 비교 결과의 {@code TIE} 에 대응한다. 사용자에게는 "우열을 가리기 어렵다"는 의미다. */
    BALANCED;

    private static final String UPSTREAM_TIE_CODE = "TIE";

    /**
     * 상권 비교 API(commercial-service)가 준 코드값을 AI 리포트 계약값으로 옮긴다.
     * 알 수 없는 코드는 비어 있는 결과로 돌려주고, 그대로 흘려보낼지는 호출부가 결정한다.
     */
    public static Optional<AiComparisonRecommendedSide> fromUpstreamCode(String upstreamCode) {
        if (upstreamCode == null || upstreamCode.isBlank()) {
            return Optional.empty();
        }
        String normalized = upstreamCode.toUpperCase(Locale.ROOT);
        if (UPSTREAM_TIE_CODE.equals(normalized)) {
            return Optional.of(BALANCED);
        }
        return fromCode(normalized);
    }

    /** LLM 이 돌려준 값이 계약값인지 판정한다. */
    public static boolean isSupportedCode(String code) {
        return fromCode(code).isPresent();
    }

    private static Optional<AiComparisonRecommendedSide> fromCode(String code) {
        if (code == null) {
            return Optional.empty();
        }
        return Arrays.stream(values()).filter(side -> side.name().equals(code)).findFirst();
    }
}
