package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatMessage;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatRequest;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiChatResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiJsonSchema;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiSchemaDefinition;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiSchemaMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiArraySchemaDefinition;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiResponseFormat;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiObjectSchemaDefinition;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiStringSchemaDefinition;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.netty.channel.ChannelOption;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Component
@ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OPENAI")
public class OpenAiLlmClientAdapter implements AiLlmPort {

    private static final String SYSTEM_PROMPT = """
        당신은 서울시 상권 분석 서비스를 위한 AI 어시스턴트입니다.
        제공된 데이터만 사용하세요.
        근거 없는 내용을 추측하거나 지어내지 마세요.
        창업 성공, 수익, 성장 가능성을 단정적으로 표현하지 마세요.
        응답의 모든 서술형 문자열은 반드시 한국어로 작성하세요.
        JSON 이외의 추가 설명은 절대 포함하지 마세요.
    """;

    // 서킷브레이커 인스턴스명(application.yml resilience4j.circuitbreaker.instances 키와 일치).
    // provider(OLLAMA/OPENAI)와 무관하게 LLM 의존 하나로 취급한다.
    private static final String LLM_CIRCUIT = "llm";
    private static final int CONNECT_TIMEOUT_MILLIS = 3000;

    private final WebClient webClient;
    private final OpenAiSchemaMapper schemaMapper;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;
    private final AiReportPromptTemplate promptTemplate;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public OpenAiLlmClientAdapter(
        WebClient.Builder webClientBuilder, OpenAiSchemaMapper schemaMapper, AiStructuredResponseParser parser, AiLlmProperties properties,
        AiReportPromptTemplate promptTemplate, CircuitBreakerRegistry circuitBreakerRegistry
    ) {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, CONNECT_TIMEOUT_MILLIS)
            .responseTimeout(Duration.ofMillis(properties.timeoutMs()));
        this.webClient = webClientBuilder
            .baseUrl(properties.baseUrl())
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.schemaMapper = schemaMapper;
        this.parser = parser;
        this.properties = properties;
        this.promptTemplate = promptTemplate;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
    }

    @Override
    public AiGenerationResult<CommercialAiDraft> generateCommercialReport(CommercialAiSourceData sourceData) {
        OpenAiChatResponse response = requestStructuredContent(promptTemplate.buildCommercialPrompt(sourceData), buildCommercialResponseSchema());
        return new AiGenerationResult<>(parser.parseCommercialReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<CommercialComparisonAiDraft> generateCommercialComparisonReport(CommercialComparisonAiSourceData sourceData) {
        OpenAiChatResponse response = requestStructuredContent(
            promptTemplate.buildCommercialComparisonPrompt(sourceData),
            buildCommercialComparisonResponseSchema()
        );
        return new AiGenerationResult<>(parser.parseCommercialComparisonReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<DistrictAiDraft> generateDistrictReport(DistrictAiSourceData sourceData) {
        OpenAiChatResponse response = requestStructuredContent(
            promptTemplate.buildDistrictPrompt(sourceData), buildRegionalResponseSchema("district_ai_report")
        );
        return new AiGenerationResult<>(parser.parseDistrictReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<AdministrationAiDraft> generateAdministrationReport(AdministrationAiSourceData sourceData) {
        OpenAiChatResponse response = requestStructuredContent(
            promptTemplate.buildAdministrationPrompt(sourceData), buildRegionalResponseSchema("administration_ai_report")
        );
        return new AiGenerationResult<>(parser.parseAdministrationReport(extractContent(response)), extractUsage(response));
    }

    private OpenAiChatResponse requestStructuredContent(String userPrompt, OpenAiSchemaDefinition schemaDefinition) {
        validateApiKey();
        try {
            // 응답 오류(WebClientResponseException)뿐 아니라 타임아웃·커넥션 실패·서킷 오픈까지
            // 전부 AI_002로 변환해야 하므로 RuntimeException 전체를 잡는다 (Ollama 어댑터와 동일).
            return circuitBreakerRegistry.circuitBreaker(LLM_CIRCUIT).executeSupplier(() ->
                webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(buildRequestBody(userPrompt, schemaDefinition))
                    .retrieve()
                    .bodyToMono(OpenAiChatResponse.class)
                    .block(Duration.ofMillis(properties.timeoutMs()))
            );
        } catch (RuntimeException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private String extractContent(OpenAiChatResponse response) {
        if (response == null
            || response.choices() == null
            || response.choices().isEmpty()
            || response.choices().get(0).message() == null
            || response.choices().get(0).message().content() == null
            || response.choices().get(0).message().content().isBlank()) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
        return response.choices().get(0).message().content();
    }

    private AiUsageMeta extractUsage(OpenAiChatResponse response) {
        return AiUsageMeta.empty(properties.model());
    }

    private OpenAiChatRequest buildRequestBody(String userPrompt, OpenAiSchemaDefinition schemaDefinition) {
        return OpenAiChatRequest.builder()
            .model(properties.model())
            .temperature(properties.temperature())
            .maxTokens(properties.maxTokens())
            .messages(List.of(buildSystemMessage(), buildUserMessage(userPrompt)))
            .responseFormat(buildResponseFormat(schemaDefinition))
            .build();
    }

    private OpenAiChatMessage buildSystemMessage() {
        return OpenAiChatMessage.builder().role("system").content(SYSTEM_PROMPT).build();
    }

    private OpenAiChatMessage buildUserMessage(String userPrompt) {
        return OpenAiChatMessage.builder().role("user").content(userPrompt).build();
    }

    private OpenAiResponseFormat buildResponseFormat(OpenAiSchemaDefinition schemaDefinition) {
        String schemaName = schemaDefinition instanceof OpenAiObjectSchemaDefinition objectSchema && objectSchema.title() != null
            ? objectSchema.title()
            : "ai_report";
        return OpenAiResponseFormat.builder()
            .type("json_schema")
            .jsonSchema(OpenAiJsonSchema.builder().name(schemaName).strict(true).schema(schemaMapper.toJsonNode(schemaDefinition)).build())
            .build();
    }

    private void validateApiKey() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE);
        }
    }

    private OpenAiObjectSchemaDefinition buildCommercialResponseSchema() {
        LinkedHashMap<String, OpenAiSchemaDefinition> properties = new LinkedHashMap<>();
        properties.put("summary", stringSchema());
        properties.put("strengths", stringArraySchema());
        properties.put("risks", stringArraySchema());
        properties.put("recommendedBusinessCategories", stringArraySchema());
        properties.put("recommendedCustomerSegments", stringArraySchema());
        properties.put("recommendedOperatingHours", stringArraySchema());
        properties.put("avoidOperatingHours", stringArraySchema(0));
        properties.put("targetAgeGroups", stringArraySchema(0));
        properties.put("targetGenders", stringArraySchema(0));
        properties.put("operationTips", stringArraySchema(0));
        properties.put("businessInsight", stringSchema());
        return new OpenAiObjectSchemaDefinition(
            "commercial_ai_report",
            properties,
            List.of(
                "summary", "strengths", "risks",
                "recommendedBusinessCategories", "recommendedCustomerSegments", "recommendedOperatingHours",
                "avoidOperatingHours", "targetAgeGroups", "targetGenders", "operationTips", "businessInsight"
            ),
            false
        );
    }

    private OpenAiObjectSchemaDefinition buildRegionalResponseSchema(String title) {
        LinkedHashMap<String, OpenAiSchemaDefinition> properties = new LinkedHashMap<>();
        properties.put("summary", stringSchema());
        properties.put("marketStatus", stringSchema());
        properties.put("recommendedBusinessCategories", stringArraySchema());
        properties.put("cautionBusinessCategories", stringArraySchema());
        properties.put("businessInsight", stringSchema());
        return new OpenAiObjectSchemaDefinition(
            title,
            properties,
            List.of("summary", "marketStatus", "recommendedBusinessCategories", "cautionBusinessCategories", "businessInsight"),
            false
        );
    }

    private OpenAiObjectSchemaDefinition buildCommercialComparisonResponseSchema() {
        LinkedHashMap<String, OpenAiSchemaDefinition> properties = new LinkedHashMap<>();
        properties.put("summary", stringSchema());
        properties.put("recommendedSide", stringSchema());
        properties.put("recommendedReasons", stringArraySchema());
        properties.put("riskComparison", stringSchema());
        properties.put("timeSlotInsight", stringSchema());
        properties.put("customerSegmentInsight", stringSchema());
        properties.put("operationStrategy", stringArraySchema());
        properties.put("businessInsight", stringSchema());
        return new OpenAiObjectSchemaDefinition(
            "commercial_comparison_ai_report",
            properties,
            List.of(
                "summary",
                "recommendedSide",
                "recommendedReasons",
                "riskComparison",
                "timeSlotInsight",
                "customerSegmentInsight",
                "operationStrategy",
                "businessInsight"
            ),
            false
        );
    }

    private OpenAiStringSchemaDefinition stringSchema() {
        return new OpenAiStringSchemaDefinition();
    }

    private OpenAiArraySchemaDefinition stringArraySchema() {
        return stringArraySchema(1);
    }

    private OpenAiArraySchemaDefinition stringArraySchema(int minItems) {
        return new OpenAiArraySchemaDefinition(stringSchema(), minItems);
    }
}
