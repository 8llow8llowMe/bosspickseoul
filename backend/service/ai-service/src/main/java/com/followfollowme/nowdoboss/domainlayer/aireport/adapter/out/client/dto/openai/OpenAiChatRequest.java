package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Builder;

@Builder
public record OpenAiChatRequest(
    String model,
    double temperature,
    @JsonProperty("max_tokens") int maxTokens,
    List<OpenAiChatMessage> messages,
    @JsonProperty("response_format") OpenAiResponseFormat responseFormat
) {

}
