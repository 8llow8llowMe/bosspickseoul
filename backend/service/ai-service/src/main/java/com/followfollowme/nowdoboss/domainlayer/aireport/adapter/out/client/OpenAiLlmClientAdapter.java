package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatRequest;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;
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
        당신은 서울시 상권 분석 서비스의 AI 리포트 도우미입니다.
        반드시 제공된 데이터만 사용하고, 창업 성공이나 수익을 단정하지 마세요.
        모든 응답은 지정된 JSON 스키마만 따라야 합니다.
        """;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;

    public OpenAiLlmClientAdapter(WebClient.Builder webClientBuilder, ObjectMapper objectMapper, AiStructuredResponseParser parser, AiLlmProperties properties) {
        this.webClient = webClientBuilder.baseUrl(properties.baseUrl())
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.objectMapper = objectMapper;
        this.parser = parser;
        this.properties = properties;
    }

    @Override
    public CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData) {
        String content = requestStructuredContent(AiReportPromptTemplate.buildCommercialPrompt(sourceData), buildCommercialResponseSchema());
        return parser.parseCommercialReport(content);
    }

    @Override
    public DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData) {
        String content = requestStructuredContent(AiReportPromptTemplate.buildDistrictPrompt(sourceData), buildDistrictResponseSchema());
        return parser.parseDistrictReport(content);
    }

    private String requestStructuredContent(String userPrompt, ObjectNode schemaNode) {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE);
        }

        try {
            OpenAiChatResponse response = webClient.post().uri("/chat/completions")
                .bodyValue(buildRequestBody(userPrompt, schemaNode))
                .retrieve()
                .bodyToMono(OpenAiChatResponse.class)
                .block(Duration.ofMillis(properties.timeoutMs()));

            if (response == null || response.choices() == null || response.choices().isEmpty()
                || response.choices().get(0).message() == null || response.choices().get(0).message().content() == null
                || response.choices().get(0).message().content().isBlank()) {
                throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
            }
            return response.choices().get(0).message().content();
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private OpenAiChatRequest buildRequestBody(String userPrompt, ObjectNode schemaNode) {
        return new OpenAiChatRequest(
            properties.model(),
            properties.temperature(),
            properties.maxTokens(),
            List.of(
                new com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatMessage("system", SYSTEM_PROMPT),
                new com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatMessage("user", userPrompt)
            ),
            new com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiResponseFormat(
                "json_schema",
                new com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiJsonSchema(
                    schemaNode.path("title").asText("ai_report"),
                    true,
                    schemaNode
                )
            )
        );
    }

    private ObjectNode buildCommercialResponseSchema() {
        ObjectNode schema = baseObjectSchema("commercial_ai_report");
        schema.set("properties", objectMapper.createObjectNode()
            .putObject("summary").put("type", "string").parent()
            .set("strengths", stringArraySchema())
            .set("risks", stringArraySchema())
            .set("recommendedCustomerSegments", stringArraySchema())
            .set("recommendedOperatingHours", stringArraySchema())
            .putObject("businessInsight").put("type", "string").parent());
        schema.set("required", stringArrayNode("summary", "strengths", "risks", "recommendedCustomerSegments", "recommendedOperatingHours", "businessInsight"));
        return schema;
    }

    private ObjectNode buildDistrictResponseSchema() {
        ObjectNode schema = baseObjectSchema("district_ai_report");
        schema.set("properties", objectMapper.createObjectNode()
            .putObject("summary").put("type", "string").parent()
            .putObject("marketStatus").put("type", "string").parent()
            .set("recommendedBusinessCategories", stringArraySchema())
            .set("cautionBusinessCategories", stringArraySchema())
            .putObject("businessInsight").put("type", "string").parent());
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

    private ObjectNode stringArraySchema() {
        ObjectNode arraySchema = objectMapper.createObjectNode();
        arraySchema.put("type", "array");
        arraySchema.put("minItems", 1);
        arraySchema.set("items", objectMapper.createObjectNode().put("type", "string"));
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
