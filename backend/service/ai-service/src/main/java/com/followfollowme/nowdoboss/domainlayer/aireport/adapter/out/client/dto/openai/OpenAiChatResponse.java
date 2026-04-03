package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai;

import java.util.List;

public record OpenAiChatResponse(List<OpenAiChoice> choices) {

}
