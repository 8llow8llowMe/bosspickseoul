package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama.OllamaChatMessage;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama.OllamaChatOptions;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama.OllamaChatRequest;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.dto.ollama.OllamaChatResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiSourceData;
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
@ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
public class OllamaLlmClientAdapter implements AiLlmPort {

    private static final String SYSTEM_PROMPT = """
        당신은 서울시 상권 분석 서비스의 AI 리포트 도우미입니다.
        제공된 데이터만 사용하고, 창업 성공이나 투자 수익을 단정적으로 표현하지 마세요.
        모든 응답은 반드시 JSON 구조만 출력하고, 설명 문장은 추가하지 마세요.
        """;

    private final WebClient webClient;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;
    private final AiReportPromptTemplate promptTemplate;

    public OllamaLlmClientAdapter(
        WebClient.Builder webClientBuilder,
        AiStructuredResponseParser parser,
        AiLlmProperties properties,
        AiReportPromptTemplate promptTemplate
    ) {
        this.webClient = webClientBuilder.baseUrl(properties.baseUrl())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.parser = parser;
        this.properties = properties;
        this.promptTemplate = promptTemplate;
    }

    @Override
    public CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildCommercialPrompt(sourceData));
        return parser.parseCommercialReport(content);
    }

    @Override
    public DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildDistrictPrompt(sourceData));
        return parser.parseDistrictReport(content);
    }

    @Override
    public AdministrationAiDraft generateAdministrationReport(AdministrationAiSourceData sourceData) {
        String content = requestStructuredContent(promptTemplate.buildAdministrationPrompt(sourceData));
        return parser.parseAdministrationReport(content);
    }

    private String requestStructuredContent(String userPrompt) {
        try {
            OllamaChatResponse response = webClient.post().uri("/api/chat")
                .bodyValue(buildRequestBody(userPrompt))
                .retrieve()
                .bodyToMono(OllamaChatResponse.class)
                .block(Duration.ofMillis(properties.timeoutMs()));

            if (response == null || response.message() == null || response.message().content() == null || response.message().content().isBlank()) {
                throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
            }
            return response.message().content();
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private OllamaChatRequest buildRequestBody(String userPrompt) {
        return OllamaChatRequest.builder()
            .model(properties.model())
            .stream(false)
            .format("json")
            .messages(List.of(buildSystemMessage(), buildUserMessage(userPrompt)))
            .options(buildOptions())
            .build();
    }

    private OllamaChatMessage buildSystemMessage() {
        return OllamaChatMessage.builder().role("system").content(SYSTEM_PROMPT).build();
    }

    private OllamaChatMessage buildUserMessage(String userPrompt) {
        return OllamaChatMessage.builder().role("user").content(userPrompt).build();
    }

    private OllamaChatOptions buildOptions() {
        return OllamaChatOptions.builder().temperature(properties.temperature()).numPredict(properties.maxTokens()).build();
    }
}
