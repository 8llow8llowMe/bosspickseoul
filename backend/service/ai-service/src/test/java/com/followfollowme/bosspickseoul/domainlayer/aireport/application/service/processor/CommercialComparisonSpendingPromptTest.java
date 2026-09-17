package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.ComparisonMetricQueryResult;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 비교 리포트의 소비 지표가 0 인 채로 LLM 근거가 되지 않게 막는다.
 *
 * <p>peer 의 비교 응답은 FE 계약상 {@code spendingMetrics} 를 primitive {@code double} 로 내려주므로
 * 결측이 {@code 0} 과 구별되지 않는다. 상권 단위 소비 원천이 끊긴 지금 그 0 을 그대로 프롬프트에 실으면
 * LLM 이 "양 상권 모두 소비가 없다" 는 문장을 실측 근거처럼 만들어 낸다. (이슈 #413)
 */
class CommercialComparisonSpendingPromptTest {

    @Test
    @DisplayName("양쪽 모두 0 인 소비 지표는 수치 대신 원천 미제공으로 적는다")
    void spendingMetricsZeroOnBothSides_areMarkedAsSourceUnavailable() {
        List<String> summaries = AiReportProcessor.toSpendingMetricSummaries(List.of(metric("총 지출액", 0D, 0D)));

        assertThat(summaries).hasSize(1);
        assertThat(summaries.get(0)).contains("원천 미제공");
        assertThat(summaries.get(0)).doesNotContain("좌측 0");
    }

    @Test
    @DisplayName("소비가 복구되면 값 있는 요약이 그대로 나간다")
    void spendingMetricsWithValues_stayNumeric() {
        List<String> summaries = AiReportProcessor.toSpendingMetricSummaries(List.of(metric("총 지출액", 1_200D, 800D)));

        assertThat(summaries).hasSize(1);
        assertThat(summaries.get(0)).contains("좌측 1,200").contains("우측 800");
        assertThat(summaries.get(0)).doesNotContain("원천 미제공");
    }

    private ComparisonMetricQueryResult metric(String label, double leftValue, double rightValue) {
        return new ComparisonMetricQueryResult(
            label, leftValue, rightValue, leftValue - rightValue, 0D,
            new CodeNameDescriptionMetadata("TIE", "무승부", "두 상권이 같다"));
    }
}
