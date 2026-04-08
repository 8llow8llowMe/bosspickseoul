package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama;

import java.util.List;
import lombok.Builder;

@Builder
public record OllamaChatRequest(
    String model,
    boolean stream,
    String format,
    List<OllamaChatMessage> messages,
    OllamaChatOptions options
) {

}
