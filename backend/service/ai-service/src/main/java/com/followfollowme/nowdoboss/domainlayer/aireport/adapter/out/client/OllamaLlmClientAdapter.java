package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

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
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
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
        You are an AI assistant for a Seoul commercial analysis service.
        Use only the provided data.
        Do not make deterministic claims about startup success, profit, or guaranteed growth.
        Return JSON only.
        """;

    private final OllamaChatModel ollamaChatModel;
    private final AiStructuredResponseParser parser;
    private final AiReportPromptTemplate promptTemplate;

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
            ChatResponse response = ollamaChatModel.call(new Prompt(List.of(new SystemMessage(SYSTEM_PROMPT), new UserMessage(userPrompt)), OllamaOptions.builder().format("json").build()));
            String content = extractContent(response);
            if (content == null || content.isBlank()) {
                throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
            }
            return content;
        } catch (AiReportException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE, exception);
        }
    }

    private String extractContent(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return null;
        }
        return response.getResult().getOutput().getText();
    }
}
