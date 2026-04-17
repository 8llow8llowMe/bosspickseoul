package com.followfollowme.nowdoboss.domainlayer.policy.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.policy.application.info.PolicyRecommendationInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PolicyQueryProcessor {

    public List<PolicyRecommendationInfo> getRecommendations(
        String districtCode,
        String administrationCode,
        String businessType,
        String ageGroup,
        String startupStage
    ) {
        return List.of(
            PolicyRecommendationInfo.builder()
                .policyId("POLICY-001")
                .policyName("서울시 소상공인 창업 지원")
                .provider("서울특별시")
                .targetSummary("%s 창업 준비자".formatted(defaultText(startupStage, "예비 창업")))
                .supportSummary("창업 교육, 컨설팅, 초기 자금 연계")
                .matchingReason("%s 업종과 %s 지역 조건에 맞는 기본 창업 지원 정책입니다.".formatted(defaultText(businessType, "일반"), defaultText(districtCode, "서울시")))
                .applicationPeriod("상시 또는 분기별 공고")
                .referenceUrl("https://www.seoul.go.kr")
                .build(),
            PolicyRecommendationInfo.builder()
                .policyId("POLICY-002")
                .policyName("청년 창업 도전 프로젝트")
                .provider("서울신용보증재단")
                .targetSummary("%s 대상 청년 창업자".formatted(defaultText(ageGroup, "청년")))
                .supportSummary("멘토링, 보증, 사업화 지원")
                .matchingReason("연령대와 창업 단계 기준으로 함께 검토하기 좋은 정책입니다.")
                .applicationPeriod("연간 공고 기준")
                .referenceUrl("https://www.seoulsbdc.or.kr")
                .build()
        );
    }

    public List<PolicyRecommendationInfo> getComparisonRecommendations(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        return List.of(
            PolicyRecommendationInfo.builder()
                .policyId("POLICY-COMP-001")
                .policyName("상권 활성화 컨설팅 지원")
                .provider("서울특별시")
                .targetSummary("비교 검토 중인 예비 창업자")
                .supportSummary("상권 진단, 입지 컨설팅, 창업 전략 자문")
                .matchingReason("%s 업종 기준으로 %s와 %s을(를) 비교 중일 때 활용하기 좋은 정책입니다.".formatted(serviceCode, leftCommercialCode, rightCommercialCode))
                .applicationPeriod("%s 기준 최근 공고 확인".formatted(periodCode))
                .referenceUrl("https://www.seoul.go.kr")
                .build()
        );
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
