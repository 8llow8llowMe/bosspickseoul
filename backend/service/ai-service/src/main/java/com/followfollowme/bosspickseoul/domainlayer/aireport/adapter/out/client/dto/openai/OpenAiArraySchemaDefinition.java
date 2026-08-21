package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

public record OpenAiArraySchemaDefinition(
    OpenAiSchemaDefinition items,
    int minItems
) implements OpenAiSchemaDefinition {
}
