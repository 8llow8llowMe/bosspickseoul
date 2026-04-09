package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OpenAiSchemaMapper {

    private final ObjectMapper objectMapper;

    public JsonNode toJsonNode(OpenAiSchemaDefinition definition) {
        if (definition instanceof OpenAiObjectSchemaDefinition objectSchema) {
            return toObjectSchemaNode(objectSchema);
        }
        if (definition instanceof OpenAiArraySchemaDefinition arraySchema) {
            return toArraySchemaNode(arraySchema);
        }
        if (definition instanceof OpenAiStringSchemaDefinition) {
            return objectMapper.createObjectNode().put("type", "string");
        }
        throw new IllegalArgumentException("Unsupported OpenAI schema definition: " + definition.getClass().getName());
    }

    private ObjectNode toObjectSchemaNode(OpenAiObjectSchemaDefinition definition) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("title", definition.title());
        schema.put("type", "object");
        schema.put("additionalProperties", definition.additionalProperties());

        ObjectNode propertiesNode = objectMapper.createObjectNode();
        for (Map.Entry<String, OpenAiSchemaDefinition> entry : definition.properties().entrySet()) {
            propertiesNode.set(entry.getKey(), toJsonNode(entry.getValue()));
        }
        schema.set("properties", propertiesNode);

        ArrayNode requiredNode = objectMapper.createArrayNode();
        for (String requiredField : definition.required()) {
            requiredNode.add(requiredField);
        }
        schema.set("required", requiredNode);
        return schema;
    }

    private ObjectNode toArraySchemaNode(OpenAiArraySchemaDefinition definition) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "array");
        schema.put("minItems", definition.minItems());
        schema.set("items", toJsonNode(definition.items()));
        return schema;
    }
}
