package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AiStructuredResponseParser {

    private final ObjectMapper objectMapper;

    public AiStructuredResponseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CommercialAiDraft parseCommercialReport(String content) {
        try {
            CommercialAiDraft draft = objectMapper.readValue(content, CommercialAiDraft.class);
            validateCommercial(draft);
            return draft;
        } catch (JsonProcessingException exception) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE, exception);
        }
    }

    public DistrictAiDraft parseDistrictReport(String content) {
        try {
            DistrictAiDraft draft = objectMapper.readValue(content, DistrictAiDraft.class);
            validateDistrict(draft);
            return draft;
        } catch (JsonProcessingException exception) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE, exception);
        }
    }

    private void validateCommercial(CommercialAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.businessInsight())
            || invalidList(draft.strengths())
            || invalidList(draft.risks())
            || invalidList(draft.recommendedCustomerSegments())
            || invalidList(draft.recommendedOperatingHours())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private void validateDistrict(DistrictAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.marketStatus())
            || isBlank(draft.businessInsight())
            || invalidList(draft.recommendedBusinessCategories())
            || invalidList(draft.cautionBusinessCategories())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private boolean invalidList(List<String> values) {
        return values == null || values.isEmpty() || values.stream().anyMatch(this::isBlank);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
