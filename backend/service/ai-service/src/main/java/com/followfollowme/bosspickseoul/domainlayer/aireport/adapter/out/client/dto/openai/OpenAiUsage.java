package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

/**
 * OpenAI 호환 chat/completions 응답의 {@code usage} 블록.
 *
 * <p>필드명이 snake_case 라 {@code @JsonProperty} 로 명시한다. 서비스 ObjectMapper 는 기본 네이밍 전략을 쓰므로
 * 이 지정이 빠지면 값이 조용히 null 이 되어 사용량이 0 으로 집계된다.
 *
 * <p>usage 를 주지 않는 게이트웨이도 있어 모든 필드는 Wrapper 로 둔다(null = 제공되지 않음).
 */
@Builder
public record OpenAiUsage(

    @JsonProperty("prompt_tokens")
    Integer promptTokens,

    @JsonProperty("completion_tokens")
    Integer completionTokens,

    @JsonProperty("total_tokens")
    Integer totalTokens
) {

}
