package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record OpenAiResponseFormat(String type, @JsonProperty("json_schema") OpenAiJsonSchema jsonSchema) {

}
