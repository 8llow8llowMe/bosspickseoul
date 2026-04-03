package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai;

import java.util.List;

public record OpenAiChatRequest(
    String model,
    double temperature,
    int max_tokens,
    List<OpenAiChatMessage> messages,
    OpenAiResponseFormat response_format
) {

}
