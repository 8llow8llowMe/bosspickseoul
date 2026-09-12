package com.followfollowme.bosspickseoul.global.properties;

/**
 * gpt-oss 계열이 지원하는 추론 강도.
 *
 * <p>기본 medium 은 추론에 생성 토큰의 대부분을 소모한다(실측: 리포트 생성 37.7s -&gt; 8.2s). 그래서 운영 기본값은 low 다.
 *
 * <p><b>provider 별 적용 범위</b>: 이 설정은 {@code ai.llm.provider=OLLAMA} 일 때만 요청에 실린다.
 * OPENAI 호환 어댑터는 이 값을 읽지 않으므로 provider 를 OPENAI 로 두면 설정이 조용히 무시된다.
 * OpenAI 호환 API 의 reasoning 파라미터는 모델·게이트웨이마다 이름과 허용값이 달라 일괄 매핑이 불가능하다.
 */
public enum AiLlmReasoningEffort {

    LOW,
    MEDIUM,
    HIGH
}
