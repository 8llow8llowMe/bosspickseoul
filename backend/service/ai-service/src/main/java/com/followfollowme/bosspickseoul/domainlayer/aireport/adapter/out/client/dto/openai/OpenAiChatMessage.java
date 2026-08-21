package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

import lombok.Builder;

@Builder
public record OpenAiChatMessage(String role, String content) {

}
