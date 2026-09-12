package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileKeyMetricsInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.PolicyInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileKeyMetricsQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewMetricQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewTargetQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.PolicyQueryResult;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 상권 프로필과 비교 프리뷰를 commercial-service 에서 받아 Info 로 옮긴다.
 *
 * <p>DB 조회가 없는 유스케이스라 트랜잭션을 열지 않는다. 원격 응답을 기다리는 동안 커넥션을 잡을 이유가 없다.
 */
@Service
@RequiredArgsConstructor
public class MapProfileQueryProcessor {

    private final CommercialProfileQueryPort commercialProfileQueryPort;

    public CommercialProfileAreaInfo getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        CommercialProfileQueryResult result = commercialProfileQueryPort
            .getCommercialProfile(commercialCode, serviceCode, periodCode);
        return toCommercialProfileAreaInfo(result);
    }

    public CommercialComparePreviewInfo getCommercialComparePreview(String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode) {
        CommercialComparePreviewQueryResult result = commercialProfileQueryPort
            .getCommercialComparePreview(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
        return toCommercialComparePreviewInfo(result);
    }

    private CommercialProfileAreaInfo toCommercialProfileAreaInfo(CommercialProfileQueryResult result) {
        if (result == null) {
            return CommercialProfileAreaInfo.builder()
                .boundaryCoords(List.of())
                .policyRecommendations(List.of())
                .build();
        }
        CommercialProfileKeyMetricsQueryResult keyMetricsResult = result.keyMetrics();
        CommercialProfileKeyMetricsInfo keyMetrics = keyMetricsResult == null ? null : CommercialProfileKeyMetricsInfo.builder()
            .totalSalesAmount(keyMetricsResult.totalSalesAmount())
            .totalFootTraffic(keyMetricsResult.totalFootTraffic())
            .totalStoreCount(keyMetricsResult.totalStoreCount())
            .similarStoreCount(keyMetricsResult.similarStoreCount())
            .openingRate(keyMetricsResult.openingRate())
            .closureRate(keyMetricsResult.closureRate())
            .totalResidentPopulation(keyMetricsResult.totalResidentPopulation())
            .monthlyAverageIncomeAmount(keyMetricsResult.monthlyAverageIncomeAmount())
            .totalFacilityCount(keyMetricsResult.totalFacilityCount())
            .build();

        return CommercialProfileAreaInfo.builder()
            .commercialCode(result.commercialCode())
            .commercialName(result.commercialName())
            .districtCode(result.districtCode())
            .districtName(result.districtName())
            .administrationCode(result.administrationCode())
            .administrationName(result.administrationName())
            .policyRecommendations(toPolicyInfos(result.policyRecommendations()))
            .centerLng(null)
            .centerLat(null)
            .boundaryCoords(List.of())
            .keyMetrics(keyMetrics)
            .build();
    }

    private CommercialComparePreviewInfo toCommercialComparePreviewInfo(CommercialComparePreviewQueryResult result) {
        if (result == null) {
            return CommercialComparePreviewInfo.builder()
                .headlineMetrics(List.of())
                .build();
        }
        List<ComparePreviewMetricInfo> metrics = result.headlineMetrics() == null
            ? List.of()
            : result.headlineMetrics().stream()
                .map(this::toComparePreviewMetricInfo)
                .toList();

        return CommercialComparePreviewInfo.builder()
            .left(toComparePreviewTargetInfo(result.left()))
            .right(toComparePreviewTargetInfo(result.right()))
            .recommendedSide(result.recommendedSide())
            .headlineMetrics(metrics)
            .insightOneLiner(result.insightOneLiner())
            .build();
    }

    private ComparePreviewTargetInfo toComparePreviewTargetInfo(ComparePreviewTargetQueryResult target) {
        if (target == null) {
            return null;
        }
        return ComparePreviewTargetInfo.builder()
            .commercialCode(target.commercialCode())
            .commercialName(target.commercialName())
            .districtCode(target.districtCode())
            .districtName(target.districtName())
            .administrationCode(target.administrationCode())
            .administrationName(target.administrationName())
            .build();
    }

    private ComparePreviewMetricInfo toComparePreviewMetricInfo(ComparePreviewMetricQueryResult metric) {
        return ComparePreviewMetricInfo.builder()
            .label(metric.label())
            .leftValue(metric.leftValue())
            .rightValue(metric.rightValue())
            .diffValue(metric.diffValue())
            .diffRate(metric.diffRate())
            .winnerSide(metric.winnerSide())
            .build();
    }

    /**
     * 상권 프로필에 동봉된 지원 정책을 그대로 통과시킨다.
     *
     * <p>정책 매칭은 commercial-service 의 책임이라 여기서 다시 판정하지 않는다. 지도 프로필이
     * 좌표와 정책을 한 번에 내려줘야 화면이 공개 계약 하나만 보고 그릴 수 있다.
     */
    private List<PolicyInfo> toPolicyInfos(List<PolicyQueryResult> results) {
        if (results == null) {
            return List.of();
        }
        return results.stream()
            .filter(Objects::nonNull)
            .map(policy -> PolicyInfo.builder()
                .policyId(policy.policyId())
                .title(policy.title())
                .organization(policy.organization())
                .supportType(policy.supportType())
                .supportTypeName(policy.supportTypeName())
                .targetSummary(policy.targetSummary())
                .supportContent(policy.supportContent())
                .districtCode(policy.districtCode())
                .serviceCategoryCode(policy.serviceCategoryCode())
                .applyStartAt(policy.applyStartAt())
                .applyEndAt(policy.applyEndAt())
                .detailUrl(policy.detailUrl())
                .build())
            .toList();
    }
}
