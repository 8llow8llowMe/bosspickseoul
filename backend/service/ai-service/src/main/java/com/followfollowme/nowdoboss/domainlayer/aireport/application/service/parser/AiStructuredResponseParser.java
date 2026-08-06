package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import java.util.List;
import java.util.function.Consumer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AiStructuredResponseParser {

    private static final String HANGUL_REGEX = ".*[가-힣].*";
    // 실패 원인 추적용 원본 로그 길이 제한. 리포트 원문은 공공 상권 데이터 기반이라 민감정보가 없다.
    private static final int LOG_CONTENT_MAX_LENGTH = 800;

    private final ObjectMapper objectMapper;

    public AiStructuredResponseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CommercialAiDraft parseCommercialReport(String content) {
        return parse("commercial", content, CommercialAiDraft.class, this::validateCommercial);
    }

    public DistrictAiDraft parseDistrictReport(String content) {
        return parse("district", content, DistrictAiDraft.class, this::validateDistrict);
    }

    public CommercialComparisonAiDraft parseCommercialComparisonReport(String content) {
        return parse("commercial-comparison", content, CommercialComparisonAiDraft.class, this::validateCommercialComparison);
    }

    public AdministrationAiDraft parseAdministrationReport(String content) {
        return parse("administration", content, AdministrationAiDraft.class, this::validateAdministration);
    }

    private <T> T parse(String reportType, String content, Class<T> draftType, Consumer<T> validator) {
        T draft;
        try {
            draft = objectMapper.readValue(content, draftType);
        } catch (JsonProcessingException exception) {
            logInvalidContent(reportType, "JSON 파싱 실패: " + exception.getOriginalMessage(), content);
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE, exception);
        }
        try {
            validator.accept(draft);
        } catch (AiReportException exception) {
            logInvalidContent(reportType, "필수 필드 검증 실패 (누락/빈 값/한국어 미포함)", content);
            throw exception;
        }
        return draft;
    }

    private void logInvalidContent(String reportType, String reason, String content) {
        String snippet = content == null ? "null"
            : content.length() <= LOG_CONTENT_MAX_LENGTH ? content
            : content.substring(0, LOG_CONTENT_MAX_LENGTH) + "...(truncated)";
        log.warn("AI 리포트 응답 해석 실패 reportType={} reason={} content={}", reportType, reason, snippet);
    }

    private void validateCommercial(CommercialAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.businessInsight())
            || !containsHangul(draft.summary())
            || !containsHangul(draft.businessInsight())
            || invalidList(draft.strengths())
            || invalidList(draft.risks())
            || invalidList(draft.recommendedBusinessCategories())
            || invalidList(draft.recommendedCustomerSegments())
            || invalidList(draft.recommendedOperatingHours())
            || draft.avoidOperatingHours() == null
            || draft.targetAgeGroups() == null
            || draft.targetGenders() == null
            || draft.operationTips() == null
            || hasBlank(draft.avoidOperatingHours())
            || hasBlank(draft.targetAgeGroups())
            || hasBlank(draft.targetGenders())
            || hasBlank(draft.operationTips())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private void validateDistrict(DistrictAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.marketStatus())
            || isBlank(draft.businessInsight())
            || !containsHangul(draft.summary())
            || !containsHangul(draft.marketStatus())
            || !containsHangul(draft.businessInsight())
            || invalidList(draft.recommendedBusinessCategories())
            || invalidList(draft.cautionBusinessCategories())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private void validateCommercialComparison(CommercialComparisonAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.recommendedSide())
            || isBlank(draft.riskComparison())
            || isBlank(draft.timeSlotInsight())
            || isBlank(draft.customerSegmentInsight())
            || isBlank(draft.businessInsight())
            || !containsHangul(draft.summary())
            || !containsHangul(draft.riskComparison())
            || !containsHangul(draft.timeSlotInsight())
            || !containsHangul(draft.customerSegmentInsight())
            || !containsHangul(draft.businessInsight())
            || invalidList(draft.recommendedReasons())
            || invalidList(draft.operationStrategy())
            || !List.of("LEFT", "RIGHT", "BALANCED").contains(draft.recommendedSide())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private void validateAdministration(AdministrationAiDraft draft) {
        if (isBlank(draft.summary())
            || isBlank(draft.marketStatus())
            || isBlank(draft.businessInsight())
            || !containsHangul(draft.summary())
            || !containsHangul(draft.marketStatus())
            || !containsHangul(draft.businessInsight())
            || invalidList(draft.recommendedBusinessCategories())
            || invalidList(draft.cautionBusinessCategories())) {
            throw new AiReportException(AiReportErrorCode.INVALID_LLM_RESPONSE);
        }
    }

    private boolean invalidList(List<String> values) {
        return values == null || values.isEmpty() || values.stream().anyMatch(this::isBlank);
    }

    private boolean hasBlank(List<String> values) {
        return values.stream().anyMatch(this::isBlank);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean containsHangul(String value) {
        return value != null && value.matches(HANGUL_REGEX);
    }
}
