package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record OllamaChatOptions(@JsonProperty("temperature") double temperature, @JsonProperty("num_predict") int numPredict) {

}
