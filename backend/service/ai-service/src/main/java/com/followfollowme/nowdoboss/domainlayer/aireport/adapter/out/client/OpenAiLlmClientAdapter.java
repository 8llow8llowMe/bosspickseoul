package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.AiLlmProperties;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class OpenAiLlmClientAdapter implements AiLlmPort {

    private static final String SYSTEM_PROMPT = """
        당신은 서울시 상권 분석 서비스의 AI 리포트 도우미입니다.
        반드시 제공된 데이터만 사용하고, 창업 성공이나 수익을 단정하지 마세요.
        모든 응답은 지정된 JSON 스키마를 따라야 합니다.
        """;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;

    public OpenAiLlmClientAdapter(
        WebClient.Builder webClientBuilder,
        ObjectMapper objectMapper,
        AiStructuredResponseParser parser,
        AiLlmProperties properties
    ) {
        this.webClient = webClientBuilder
            .baseUrl(properties.baseUrl())
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.objectMapper = objectMapper;
        this.parser = parser;
        this.properties = properties;
    }

    @Override
    public CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData) {
        String content = requestStructuredContent(
            AiReportPromptTemplate.buildCommercialPrompt(sourceData),
            buildCommercialResponseSchema()
        );
        return parser.parseCommercialReport(content);
    }

    @Override
    public DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData) {
        String content = requestStructuredContent(
            AiReportPromptTemplate.buildDistrictPrompt(sourceData),
            buildDistrictResponseSchema()
        );
        return parser.parseDistrictReport(content);
    }

    private String requestStructuredContent(String userPrompt, ObjectNode schemaNode) {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE);
        }

        try {
            JsonNode response = webClient.post()
                .uri("/chat/completions")
                .bodyValue(buildRequestBody(userPrompt, schemaNode))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block(Duration.ofMillis(properties.timeoutMs()));

            JsonNode contentNode = response.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
            }
            return contentNode.asText();
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private ObjectNode buildRequestBody(String userPrompt, ObjectNode schemaNode) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", properties.model());
        body.put("temperature", properties.temperature());
        body.put("max_tokens", properties.maxTokens());
        body.set("messages", buildMessages(userPrompt));
        body.set("response_format", buildResponseFormat(schemaNode));
        return body;
    }

    private ArrayNode buildMessages(String userPrompt) {
        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode()
            .put("role", "system")
            .put("content", SYSTEM_PROMPT));
        messages.add(objectMapper.createObjectNode()
            .put("role", "user")
            .put("content", userPrompt));
        return messages;
    }

    private ObjectNode buildResponseFormat(ObjectNode schemaNode) {
        ObjectNode jsonSchema = objectMapper.createObjectNode();
        jsonSchema.put("name", schemaNode.path("title").asText("ai_report"));
        jsonSchema.put("strict", true);
        jsonSchema.set("schema", schemaNode);

        ObjectNode responseFormat = objectMapper.createObjectNode();
        responseFormat.put("type", "json_schema");
        responseFormat.set("json_schema", jsonSchema);
        return responseFormat;
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
        schema.set("required", stringArrayNode(
            "summary",
            "strengths",
            "risks",
            "recommendedCustomerSegments",
            "recommendedOperatingHours",
            "businessInsight"
        ));
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
        schema.set("required", stringArrayNode(
            "summary",
            "marketStatus",
            "recommendedBusinessCategories",
            "cautionBusinessCategories",
            "businessInsight"
        ));
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
