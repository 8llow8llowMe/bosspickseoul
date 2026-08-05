package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

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
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
public class OllamaLlmClientAdapter implements AiLlmPort {

    private static final String SYSTEM_PROMPT = """
        당신은 서울시 상권 분석 서비스를 위한 AI 어시스턴트입니다.
        제공된 데이터만 사용하세요.
        근거 없는 내용을 추측하거나 지어내지 마세요.
        창업 성공, 수익, 성장 가능성을 단정적으로 표현하지 마세요.
        응답의 모든 서술형 문자열은 반드시 한국어로 작성하세요.
        모든 서술형 문장은 "~입니다", "~합니다" 형태의 존댓말로 작성하세요.
        "~이다", "~한다", "~있다" 같은 평서체는 사용하지 마세요.
        JSON만 반환하세요.
        """;

    // 서킷브레이커 인스턴스명(application.yml resilience4j.circuitbreaker.instances 키와 일치).
    // provider(OLLAMA/OPENAI)와 무관하게 LLM 의존 하나로 취급한다.
    private static final String LLM_CIRCUIT = "llm";

    private final OllamaChatModel ollamaChatModel;
    private final AiStructuredResponseParser parser;
    private final AiReportPromptTemplate promptTemplate;
    private final AiLlmProperties aiLlmProperties;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @Override
    public AiGenerationResult<CommercialAiDraft> generateCommercialReport(CommercialAiSourceData sourceData) {
        ChatResponse response = requestStructuredContent(promptTemplate.buildCommercialPrompt(sourceData));
        return new AiGenerationResult<>(parser.parseCommercialReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<CommercialComparisonAiDraft> generateCommercialComparisonReport(CommercialComparisonAiSourceData sourceData) {
        ChatResponse response = requestStructuredContent(promptTemplate.buildCommercialComparisonPrompt(sourceData));
        return new AiGenerationResult<>(parser.parseCommercialComparisonReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<DistrictAiDraft> generateDistrictReport(DistrictAiSourceData sourceData) {
        ChatResponse response = requestStructuredContent(promptTemplate.buildDistrictPrompt(sourceData));
        return new AiGenerationResult<>(parser.parseDistrictReport(extractContent(response)), extractUsage(response));
    }

    @Override
    public AiGenerationResult<AdministrationAiDraft> generateAdministrationReport(AdministrationAiSourceData sourceData) {
        ChatResponse response = requestStructuredContent(promptTemplate.buildAdministrationPrompt(sourceData));
        return new AiGenerationResult<>(parser.parseAdministrationReport(extractContent(response)), extractUsage(response));
    }

    private ChatResponse requestStructuredContent(String userPrompt) {
        try {
            // 서킷 오픈(CallNotPermittedException) 포함 모든 RuntimeException을 AI_002로 변환한다.
            return circuitBreakerRegistry.circuitBreaker(LLM_CIRCUIT).executeSupplier(() ->
                ollamaChatModel.call(new Prompt(
                    List.of(new SystemMessage(SYSTEM_PROMPT), new UserMessage(userPrompt)),
                    OllamaOptions.builder().format("json").build()
                ))
            );
        } catch (RuntimeException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private String extractContent(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
        String text = response.getResult().getOutput().getText();
        if (text == null || text.isBlank()) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
        return text;
    }

    private AiUsageMeta extractUsage(ChatResponse response) {
        String modelName = aiLlmProperties.model();
        if (response == null || response.getMetadata() == null) {
            return AiUsageMeta.empty(modelName);
        }
        Usage usage = response.getMetadata().getUsage();
        if (usage == null) {
            return AiUsageMeta.empty(modelName);
        }
        Integer promptTokens = usage.getPromptTokens();
        Integer completionTokens = usage.getCompletionTokens();
        return new AiUsageMeta(
            modelName,
            promptTokens == null ? 0 : promptTokens,
            completionTokens == null ? 0 : completionTokens
        );
    }
}
