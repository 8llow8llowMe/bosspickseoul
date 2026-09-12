package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt.AiReportPromptRules;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProperties;
import com.followfollowme.bosspickseoul.global.properties.AiLlmReasoningEffort;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
public class OllamaLlmClientAdapter implements AiLlmPort {

    // 지시문은 provider 별로 달라지면 안 된다. 정본은 AiReportPromptRules 한 곳이다.
    private static final String SYSTEM_PROMPT = AiReportPromptRules.COMMON_RULES;

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
                    buildRequestOptions()
                ))
            );
        } catch (RuntimeException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private OllamaChatOptions buildRequestOptions() {
        OllamaChatOptions.Builder builder = OllamaChatOptions.builder().format("json");
        // gpt-oss는 low/medium/high 추론 강도를 지원한다(기본 medium).
        // 값을 비워 두면(설정 미지정) 모델 기본값에 맡긴다 — 추론 강도를 모르는 모델로 교체해도 기동이 깨지지 않는다.
        AiLlmReasoningEffort reasoningEffort = aiLlmProperties.reasoningEffort();
        if (reasoningEffort == null) {
            return builder.build();
        }
        switch (reasoningEffort) {
            case LOW -> builder.thinkLow();
            case MEDIUM -> builder.thinkMedium();
            case HIGH -> builder.thinkHigh();
        }
        return builder.build();
    }

    private String extractContent(ChatResponse response) {
        // AI_003 원인 추적을 위해 어느 지점에서 본문이 비었는지 구분해 남긴다.
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            log.warn("LLM 응답에 결과가 없습니다. model={} reason={}",
                aiLlmProperties.model(),
                response == null ? "response null" : response.getResult() == null ? "result null" : "output null");
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
        String text = response.getResult().getOutput().getText();
        if (text == null || text.isBlank()) {
            log.warn("LLM 응답 본문이 비어 있습니다. model={} finishReason={}",
                aiLlmProperties.model(),
                response.getResult().getMetadata() == null ? "unknown" : response.getResult().getMetadata().getFinishReason());
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
