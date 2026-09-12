package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

/**
 * 모든 AI 리포트 생성에 공통으로 적용되는 지시문의 단일 출처.
 *
 * <p>이전에는 같은 취지의 문구가 세 곳(Ollama 어댑터 SYSTEM_PROMPT / OpenAI 어댑터 SYSTEM_PROMPT /
 * {@link AiReportPromptTemplate} COMMON_RULES)에 서로 다른 문장으로 흩어져 있었다. provider 를 바꾸면
 * LLM 에 전달되는 지시가 조용히 달라져 산출물 톤과 형식이 흔들린다. 여기 하나로 모은다.
 *
 * <p>application 계층에 두는 이유: 지시문은 "리포트를 어떻게 쓸 것인가" 라는 유스케이스 규칙이지
 * 특정 provider 의 전송 방식이 아니다. adapter 가 application 을 참조하는 방향은 이미 두 어댑터가
 * {@link AiReportPromptTemplate} 를 주입받는 형태로 쓰고 있는 정상 방향이다(architecture-guide §3 Port/Adapter).
 * 별도 리소스 파일로 빼지 않은 것은, 이 문구가 파서 검증 규칙(한국어 포함 여부·JSON 전용 응답)과 한 몸이라
 * 코드와 함께 바뀌어야 하고 환경별로 다르게 주입할 값이 아니기 때문이다.
 */
public final class AiReportPromptRules {

    /**
     * system 메시지와 사용자 프롬프트 서두에 동일하게 들어가는 공통 규칙.
     *
     * <p>문구를 바꾸면 LLM 출력이 달라진다. 통합 시점 기준으로 세 출처에 있던 제약을 모두 합집합으로 담았다.
     */
    public static final String COMMON_RULES = """
        당신은 서울시 상권 분석 서비스를 위한 AI 분석가입니다.
        제공된 데이터만 사용하세요.
        근거 없는 내용을 추측하거나 지어내지 마세요.
        창업 성공, 수익, 성장 가능성을 단정적으로 표현하지 마세요.
        응답의 모든 서술형 문자열은 반드시 한국어로 작성하세요.
        모든 서술형 문장은 "~입니다", "~합니다" 형태의 존댓말로 작성하세요.
        "~이다", "~한다", "~있다" 같은 평서체는 사용하지 마세요.
        리포트 문장에서 지역(자치구/행정동/상권)과 업종을 언급할 때는 코드가 아닌 명칭을 사용하세요.
        명칭이 제공되지 않은 항목은 코드를 쓰지 말고 "이 지역", "해당 업종" 같은 일반 표현을 사용하세요.
        JSON만 반환하고, JSON 외의 문장이나 설명은 추가하지 마세요.
        """;

    private AiReportPromptRules() {
    }
}
