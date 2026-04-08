package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatMessage;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatRequest;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiJsonSchema;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiResponseFormat;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
@ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OPENAI")
public class OpenAiLlmClientAdapter implements AiLlmPort {

    private static final String SYSTEM_PROMPT = """
        You are an AI assistant for a Seoul commercial analysis service.
        Use only the provided data.
        Do not make deterministic claims about startup success, profit, or guaranteed growth.
        Return only the requested JSON payload with no extra prose.
        """;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;
    private final AiReportPromptTemplate promptTemplate;

    public OpenAiLlmClientAdapter(WebClient.Builder webClientBuilder, ObjectMapper objectMapper, AiStructuredResponseParser parser, AiLlmProperties properties, AiReportPromptTemplate promptTemplate) {
        this.webClient = webClientBuilder.baseUrl(properties.baseUrl()).defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey()).defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE).build();
        this.objectMapper = objectMapper;
        this.parser = parser;
        this.properties = properties;
        this.promptTemplate = promptTemplate;
    }

    @Override
    public CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildCommercialPrompt(sourceData), buildCommercialResponseSchema());
        return parser.parseCommercialReport(content);
    }

    @Override
    public DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildDistrictPrompt(sourceData), buildRegionalResponseSchema("district_ai_report"));
        return parser.parseDistrictReport(content);
    }

    @Override
    public AdministrationAiDraft generateAdministrationReport(AdministrationAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildAdministrationPrompt(sourceData), buildRegionalResponseSchema("administration_ai_report"));
        return parser.parseAdministrationReport(content);
    }

    private String requestStructuredContent(String userPrompt, ObjectNode schemaNode) {
        validateApiKey();
        try {
            OpenAiChatResponse response = webClient.post().uri("/chat/completions").bodyValue(buildRequestBody(userPrompt, schemaNode)).retrieve().bodyToMono(OpenAiChatResponse.class).block(Duration.ofMillis(properties.timeoutMs()));
            if (response == null || response.choices() == null || response.choices().isEmpty() || response.choices().get(0).message() == null || response.choices().get(0).message().content() == null || response.choices().get(0).message().content().isBlank()) {
                throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
            }
            return response.choices().get(0).message().content();
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private OpenAiChatRequest buildRequestBody(String userPrompt, ObjectNode schemaNode) {
        return OpenAiChatRequest.builder().model(properties.model()).temperature(properties.temperature()).maxTokens(properties.maxTokens()).messages(List.of(buildSystemMessage(), buildUserMessage(userPrompt))).responseFormat(buildResponseFormat(schemaNode)).build();
    }

    private OpenAiChatMessage buildSystemMessage() {
        return OpenAiChatMessage.builder().role("system").content(SYSTEM_PROMPT).build();
    }

    private OpenAiChatMessage buildUserMessage(String userPrompt) {
        return OpenAiChatMessage.builder().role("user").content(userPrompt).build();
    }

    private OpenAiResponseFormat buildResponseFormat(ObjectNode schemaNode) {
        return OpenAiResponseFormat.builder().type("json_schema").jsonSchema(OpenAiJsonSchema.builder().name(schemaNode.path("title").asText("ai_report")).strict(true).schema(schemaNode).build()).build();
    }

    private void validateApiKey() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE);
        }
    }

    private ObjectNode buildCommercialResponseSchema() {
        ObjectNode schema = baseObjectSchema("commercial_ai_report");
        ObjectNode propertiesNode = objectMapper.createObjectNode();
        propertiesNode.set("summary", stringSchema());
        propertiesNode.set("strengths", stringArraySchema());
        propertiesNode.set("risks", stringArraySchema());
        propertiesNode.set("recommendedCustomerSegments", stringArraySchema());
        propertiesNode.set("recommendedOperatingHours", stringArraySchema());
        propertiesNode.set("businessInsight", stringSchema());
        schema.set("properties", propertiesNode);
        schema.set("required", stringArrayNode("summary", "strengths", "risks", "recommendedCustomerSegments", "recommendedOperatingHours", "businessInsight"));
        return schema;
    }

    private ObjectNode buildRegionalResponseSchema(String title) {
        ObjectNode schema = baseObjectSchema(title);
        ObjectNode propertiesNode = objectMapper.createObjectNode();
        propertiesNode.set("summary", stringSchema());
        propertiesNode.set("marketStatus", stringSchema());
        propertiesNode.set("recommendedBusinessCategories", stringArraySchema());
        propertiesNode.set("cautionBusinessCategories", stringArraySchema());
        propertiesNode.set("businessInsight", stringSchema());
        schema.set("properties", propertiesNode);
        schema.set("required", stringArrayNode("summary", "marketStatus", "recommendedBusinessCategories", "cautionBusinessCategories", "businessInsight"));
        return schema;
    }

    private ObjectNode baseObjectSchema(String title) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("title", title);
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        return schema;
    }

    private ObjectNode stringSchema() {
        return objectMapper.createObjectNode().put("type", "string");
    }

    private ObjectNode stringArraySchema() {
        ObjectNode arraySchema = objectMapper.createObjectNode();
        arraySchema.put("type", "array");
        arraySchema.put("minItems", 1);
        arraySchema.set("items", stringSchema());
        return arraySchema;
    }

    private ArrayNode stringArrayNode(String... values) {
        ArrayNode arrayNode = objectMapper.createArrayNode();
        for (String value : values) {
            arrayNode.add(value);
        }
        return arrayNode;
    }
}
