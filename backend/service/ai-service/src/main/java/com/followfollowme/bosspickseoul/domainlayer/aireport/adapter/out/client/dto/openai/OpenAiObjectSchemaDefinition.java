package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

import java.util.List;
import java.util.Map;

public record OpenAiObjectSchemaDefinition(
    String title,
    Map<String, OpenAiSchemaDefinition> properties,
    List<String> required,
    boolean additionalProperties
) implements OpenAiSchemaDefinition {
}
