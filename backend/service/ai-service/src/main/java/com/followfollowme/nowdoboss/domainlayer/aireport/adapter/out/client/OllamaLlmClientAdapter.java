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
        반드시 제공된 데이터만 사용하고, 창업 성공이나 수익을 단정하지 마세요.
        모든 응답은 지정된 JSON 구조만 따라야 합니다.
        JSON 외 다른 텍스트는 절대 출력하지 마세요.
        """;

    private final WebClient webClient;
    private final AiStructuredResponseParser parser;
    private final AiLlmProperties properties;

    public OllamaLlmClientAdapter(WebClient.Builder webClientBuilder, AiStructuredResponseParser parser, AiLlmProperties properties) {
        this.webClient = webClientBuilder.baseUrl(properties.baseUrl())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.parser = parser;
        this.properties = properties;
    }

    @Override
    public CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData) {
        String content = requestStructuredContent(AiReportPromptTemplate.buildCommercialPrompt(sourceData));
        return parser.parseCommercialReport(content);
    }

    @Override
    public DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData) {
        String content = requestStructuredContent(AiReportPromptTemplate.buildDistrictPrompt(sourceData));
        return parser.parseDistrictReport(content);
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
        return new OllamaChatRequest(
            properties.model(),
            false,
            "json",
            List.of(new OllamaChatMessage("system", SYSTEM_PROMPT), new OllamaChatMessage("user", userPrompt)),
            new OllamaChatOptions(properties.temperature(), properties.maxTokens())
        );
    }
}
