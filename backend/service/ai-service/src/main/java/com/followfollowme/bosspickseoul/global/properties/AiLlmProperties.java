package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.llm")
public record AiLlmProperties(
    AiLlmProvider provider,
    String baseUrl,
    String apiKey,
    String model,
    // 커넥션 수립 타임아웃. Ollama(AiLlmModelConfig)와 OpenAI 호환(OpenAiLlmClientAdapter)이 같은 값을 쓴다.
    long connectTimeoutMs,
    long timeoutMs,
    int maxTokens,
    double temperature,
    // 추론 강도. OLLAMA provider 에서만 요청에 실린다 - 자세한 내용은 AiLlmReasoningEffort 참고.
    AiLlmReasoningEffort reasoningEffort
) {

}
