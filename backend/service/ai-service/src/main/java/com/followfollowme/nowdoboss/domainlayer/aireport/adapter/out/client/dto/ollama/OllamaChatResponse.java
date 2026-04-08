package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama;

import lombok.Builder;

@Builder
public record OllamaChatResponse(OllamaChatResponseMessage message) {

}
