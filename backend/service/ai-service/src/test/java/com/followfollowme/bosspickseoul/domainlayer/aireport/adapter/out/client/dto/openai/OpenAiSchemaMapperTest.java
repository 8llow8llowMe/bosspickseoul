package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import org.junit.jupiter.api.Test;

class OpenAiSchemaMapperTest {

    private final OpenAiSchemaMapper schemaMapper = new OpenAiSchemaMapper(new ObjectMapper());

    @Test
    void mapsTypedSchemaDefinitionsToOpenAiJsonShape() {
        LinkedHashMap<String, OpenAiSchemaDefinition> properties = new LinkedHashMap<>();
        properties.put("summary", new OpenAiStringSchemaDefinition());
        properties.put("tags", new OpenAiArraySchemaDefinition(new OpenAiStringSchemaDefinition(), 0));

        OpenAiObjectSchemaDefinition definition = new OpenAiObjectSchemaDefinition(
            "commercial_ai_report",
            properties,
            List.of("summary", "tags"),
            false
        );

        assertThat(schemaMapper.toJsonNode(definition).get("title").asText()).isEqualTo("commercial_ai_report");
        assertThat(schemaMapper.toJsonNode(definition).get("type").asText()).isEqualTo("object");
        assertThat(schemaMapper.toJsonNode(definition).get("additionalProperties").asBoolean()).isFalse();
        assertThat(schemaMapper.toJsonNode(definition).get("properties").get("summary").get("type").asText()).isEqualTo("string");
        assertThat(schemaMapper.toJsonNode(definition).get("properties").get("tags").get("type").asText()).isEqualTo("array");
        assertThat(schemaMapper.toJsonNode(definition).get("properties").get("tags").get("minItems").asInt()).isZero();
        assertThat(schemaMapper.toJsonNode(definition).get("properties").get("tags").get("items").get("type").asText()).isEqualTo("string");
        assertThat(schemaMapper.toJsonNode(definition).get("required")).hasSize(2);
    }
}
