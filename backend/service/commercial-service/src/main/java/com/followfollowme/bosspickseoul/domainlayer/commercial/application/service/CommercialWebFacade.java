package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialBenchmarkResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparisonResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialHeatmapScoresResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialTrendResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.info.PolicyRecommendationInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.service.processor.PolicyQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.trend.CommercialTrendInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialBenchmarkQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialCandidateQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialComparePreviewQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialComparisonQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialHeatmapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialProfileQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialTrendQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.adapter.in.web.presenter.CommercialSummaryPresenter;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor.CommercialSummaryQueryProcessor;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommercialWebFacade implements CommercialWebUseCase {

    /** 상권 프로필에 함께 내리는 정책 추천 개수. 화면 카드가 소화할 수 있는 만큼만 담는다. */
    private static final int PROFILE_POLICY_RECOMMENDATION_SIZE = 5;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialComparisonQueryProcessor commercialComparisonQueryProcessor;
    private final CommercialBenchmarkQueryProcessor commercialBenchmarkQueryProcessor;
    private final CommercialHeatmapQueryProcessor commercialHeatmapQueryProcessor;
    private final CommercialCandidateQueryProcessor commercialCandidateQueryProcessor;
    private final CommercialProfileQueryProcessor commercialProfileQueryProcessor;
    private final CommercialComparePreviewQueryProcessor commercialComparePreviewQueryProcessor;
    private final CommercialTrendQueryProcessor commercialTrendQueryProcessor;
    private final CommercialPresenter commercialPresenter;
    private final PolicyQueryProcessor policyQueryProcessor;
    private final AnalysisViewEventPort analysisViewEventPort;
    private final CommercialSummaryQueryProcessor commercialSummaryQueryProcessor;
    private final CommercialSummaryPresenter commercialSummaryPresenter;

    @Override
    @Transactional(readOnly = true)
    public List<CommercialServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode) {
        List<CommercialServiceCategoryInfo> infos = commercialQueryProcessor.getServiceCategoriesByCommercialCode(commercialCode);
        return commercialPresenter.toCommercialServiceCategoryResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialFootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialFootTrafficInfo info = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        // 상권 상세 진입의 대표 신호로 이 API 를 사용한다 (화면당 1회 호출).
        // 포트 계약상 절대 예외를 던지지 않아 본 조회 응답에는 영향이 없다.
        analysisViewEventPort.publish(new AnalysisViewEvent(
            AnalysisAreaType.COMMERCIAL, commercialCode, info.commercialName(), LocalDateTime.now()));
        return commercialPresenter.toCommercialFootTrafficResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo info = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
            periodCode, commercialCode, serviceCode);
        return commercialPresenter.toCommercialSalesResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialFacilityResponse getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        CommercialFacilityInfo info = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialFacilityResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialResidentPopulationResponse getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        CommercialResidentPopulationInfo info = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialPopulationResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialIncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialIncomeAndExpenseInfo info = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialIncomeResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialStoreAnalysisResponse getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        CommercialStoreAnalysisInfo info = commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
            periodCode,
            commercialCode,
            serviceCode
        );
        return commercialPresenter.toCommercialStoreAnalysisResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialComparisonResponse compareCommercials(CommercialComparisonQuery query) {
        CommercialComparisonInfo info = commercialComparisonQueryProcessor.compareCommercials(query);
        return commercialPresenter.toCommercialComparisonResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialBenchmarkResponse getBenchmarks(String periodCode, String commercialCode, String serviceCode) {
        CommercialBenchmarkInfo info = commercialBenchmarkQueryProcessor.getBenchmarks(periodCode, commercialCode, serviceCode);
        return commercialPresenter.toCommercialBenchmarkResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialHeatmapScoresResponse getHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes, CommercialHeatmapMetricType metricType
    ) {
        List<CommercialHeatmapScoreInfo> infos = commercialHeatmapQueryProcessor.getHeatmapScores(
            periodCode,
            serviceCode,
            commercialCodes,
            metricType
        );
        CommercialHeatmapScoresResponseInfo responseInfo = CommercialHeatmapScoresResponseInfo.builder()
            .mode(HeatmapModeType.SINGLE_METRIC.toMetadata())
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .metricType(metricType.toScoreMetadata())
            .summary("%s 기준으로 조회한 상권 히트맵 결과입니다.".formatted(metricType.getDisplayName()))
            .scores(infos)
            .build();
        return commercialPresenter.toCommercialHeatmapScoresResponse(responseInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateCommercialsResponse getTopCandidates(
        String periodCode, String serviceCode, List<String> commercialCodes, CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric, int topN
    ) {
        CandidateCommercialsResponseInfo info = commercialCandidateQueryProcessor.getTopCandidates(
            periodCode, serviceCode, commercialCodes, preset, priorityMetric, topN
        );
        return commercialPresenter.toCandidateCommercialsResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialHeatmapScoresResponse getCompositeHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
        CommercialHeatmapScoresResponseInfo info = commercialCandidateQueryProcessor.getCompositeHeatmapScores(
            periodCode,
            serviceCode,
            commercialCodes,
            preset,
            priorityMetric
        );
        return commercialPresenter.toCommercialHeatmapScoresResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialProfileResponse getCommercialProfile(String periodCode, String commercialCode, String serviceCode) {
        CommercialProfileInfo info = commercialProfileQueryProcessor.getProfile(periodCode, commercialCode, serviceCode);
        // 프로필이 확정한 자치구로 정책을 찾는다. 요청에는 자치구가 없고 상권 코드만 오기 때문이다.
        PolicyRecommendationInfo policyInfo = policyQueryProcessor.getRecommendations(
            info.districtCode(), serviceCode, PROFILE_POLICY_RECOMMENDATION_SIZE);
        return commercialPresenter.toCommercialProfileResponse(info, policyInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialComparePreviewResponse getCommercialComparePreview(CommercialComparisonQuery query) {
        CommercialComparePreviewInfo info = commercialComparePreviewQueryProcessor.getPreview(query);
        return commercialPresenter.toCommercialComparePreviewResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesSummaryResponse getSalesSummary(
        String periodCode, String districtCode, String administrationCode, String commercialCode, String serviceCode
    ) {
        CommercialSalesSummaryInfo info = commercialSummaryQueryProcessor.getSalesSummary(
            periodCode,
            districtCode,
            administrationCode,
            commercialCode,
            serviceCode
        );
        return commercialSummaryPresenter.toCommercialSalesSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialIncomeSummaryResponse getIncomeSummary(
        String periodCode, String districtCode, String administrationCode, String commercialCode
    ) {
        CommercialIncomeSummaryInfo info = commercialSummaryQueryProcessor.getIncomeSummary(
            periodCode,
            districtCode,
            administrationCode,
            commercialCode
        );
        return commercialSummaryPresenter.toCommercialIncomeSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialTrendResponse getTrend(
        String periodCode, String commercialCode, String serviceCode, CommercialTrendMetricType metricType, int periodCount
    ) {
        CommercialTrendInfo info = commercialTrendQueryProcessor.getTrend(
            commercialCode, serviceCode, metricType, periodCode, periodCount);
        return commercialPresenter.toCommercialTrendResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateCommercialsResponse getRecommendationsByService(
        String periodCode, String serviceCode, List<String> commercialCodes, int topN
    ) {
        CandidateCommercialsResponseInfo info = commercialCandidateQueryProcessor.getTopCandidatesByService(
            periodCode, serviceCode, commercialCodes, topN);
        return commercialPresenter.toCandidateCommercialsResponse(info);
    }
}
