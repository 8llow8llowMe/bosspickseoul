package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai;

import com.fasterxml.jackson.databind.JsonNode;

public record OpenAiJsonSchema(String name, boolean strict, JsonNode schema) {

}
