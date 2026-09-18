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
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialExpenseProvenanceProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialHeatmapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialProfileQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialTrendQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.adapter.in.web.presenter.CommercialSummaryPresenter;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor.CommercialSummaryQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 읽기 유스케이스는 {@code @Transactional(readOnly = true)} 를 Facade 에 거는 것이 기본이지만,
 * <b>지역 서비스(Feign) 호출이 섞이는 여섯 경로는 예외</b>다 — {@code getIncomeByPeriodCodeAndCommercialCode},
 * {@code getIncomeSummary}, {@code compareCommercials}, {@code getCommercialComparePreview},
 * {@code getBenchmarks}, {@code getCommercialProfile} 이 상권 -> 행정동 해석을 위해 region 서비스를 부른다.
 * 여기에 트랜잭션을 걸면 상대가 느려지는 구간(서킷 오픈 직전 타임아웃)만큼 DB 커넥션이 잡혀, 소비와 무관한
 * 조회 API 까지 커넥션 고갈로 함께 죽는다. (architecture-guide §3, 이슈 #415)
 *
 * <p>트랜잭션을 <b>Processor 로 내리지 않고 떼기만 한 이유</b>는 두 가지다. 첫째, 이 경로들이 부르는 조회
 * Processor 메서드는 대부분 리포지터리 호출 한 번이라 별도 경계를 만들어도 Spring Data 가 이미 여는 읽기
 * 트랜잭션과 같다. 둘째, 이 경로들은 분기 결측을 부분 강등으로 흡수하려고 404 예외를 삼키는데
 * ({@link com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialQuietFetchSupport}),
 * 삼키는 지점 안쪽에 트랜잭션 경계를 만들면 참여 트랜잭션이 rollback-only 로 표시돼 예외를 삼켰는데도 상위
 * 커밋이 {@code UnexpectedRollbackException} 으로 깨진다. 여러 조회를 실제로 한 단위로 묶는 곳
 * ({@code CommercialSummaryQueryProcessor.getSalesSummary})에만 Processor 트랜잭션을 둔다.
 */
@Service
@RequiredArgsConstructor
public class CommercialWebFacade implements CommercialWebUseCase {

    /** 상권 프로필에 함께 내리는 정책 추천 개수. 화면 카드가 소화할 수 있는 만큼만 담는다. */
    private static final int PROFILE_POLICY_RECOMMENDATION_SIZE = 5;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialExpenseProvenanceProcessor commercialExpenseProvenanceProcessor;
    private final CommercialComparisonQueryProcessor commercialComparisonQueryProcessor;
    private final CommercialBenchmarkQueryProcessor commercialBenchmarkQueryProcessor;
    private final CommercialHeatmapQueryProcessor commercialHeatmapQueryProcessor;
    private final CommercialCandidateQueryProcessor commercialCandidateQueryProcessor;
    private final CommercialProfileQueryProcessor commercialProfileQueryProcessor;
    private final CommercialComparePreviewQueryProcessor commercialComparePreviewQueryProcessor;
    private final CommercialTrendQueryProcessor commercialTrendQueryProcessor;
    private final CommercialPresenter commercialPresenter;
    private final PolicyQueryProcessor policyQueryProcessor;
    private final AnalysisViewPublishProcessor analysisViewPublishProcessor;
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
        analysisViewPublishProcessor.publishView(
            AnalysisAreaType.COMMERCIAL, commercialCode, info.commercialName());
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

    /** 지역 서비스 Feign 이 섞이는 유스케이스라 트랜잭션을 걸지 않는다. 사유는 클래스 javadoc 참고. */
    @Override
    public CommercialIncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialIncomeAndExpenseInfo info = commercialExpenseProvenanceProcessor
            .getExpenseByPeriodCodeAndCommercialCode(periodCode, commercialCode);
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

    /** 지역 서비스 Feign 이 섞이는 유스케이스라 트랜잭션을 걸지 않는다. 사유는 클래스 javadoc 참고. */
    @Override
    public CommercialComparisonResponse compareCommercials(CommercialComparisonQuery query) {
        CommercialComparisonInfo info = commercialComparisonQueryProcessor.compareCommercials(query);
        return commercialPresenter.toCommercialComparisonResponse(info);
    }

    /** 지역 서비스 Feign 이 섞이는 유스케이스라 트랜잭션을 걸지 않는다. 사유는 클래스 javadoc 참고. */
    @Override
    public CommercialBenchmarkResponse getBenchmarks(String periodCode, String commercialCode, String serviceCode) {
        CommercialBenchmarkInfo info = commercialBenchmarkQueryProcessor.getBenchmarks(periodCode, commercialCode, serviceCode);
        return commercialPresenter.toCommercialBenchmarkResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialHeatmapScoresResponse getHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes, CommercialHeatmapMetricType metricType
    ) {
        CommercialHeatmapScoresResponseInfo info = commercialHeatmapQueryProcessor.getHeatmapScores(
            periodCode,
            serviceCode,
            commercialCodes,
            metricType
        );
        return commercialPresenter.toCommercialHeatmapScoresResponse(info);
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

    /** 지역 서비스 Feign 이 섞이는 유스케이스라 트랜잭션을 걸지 않는다. 사유는 클래스 javadoc 참고. */
    @Override
    public CommercialProfileResponse getCommercialProfile(String periodCode, String commercialCode, String serviceCode) {
        CommercialProfileInfo info = commercialProfileQueryProcessor.getProfile(periodCode, commercialCode, serviceCode);
        // 프로필이 확정한 자치구로 정책을 찾는다. 요청에는 자치구가 없고 상권 코드만 오기 때문이다.
        PolicyRecommendationInfo policyInfo = policyQueryProcessor.getRecommendations(
            info.districtCode(), serviceCode, PROFILE_POLICY_RECOMMENDATION_SIZE);
        return commercialPresenter.toCommercialProfileResponse(info, policyInfo);
    }

    /**
     * 비교 결과를 그대로 재사용하므로 {@code compareCommercials} 와 같은 Feign 경로를 탄다.
     * 트랜잭션을 걸지 않는 사유는 클래스 javadoc 참고.
     */
    @Override
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

    /**
     * 상권 leg 의 대체 원천을 정하려면 서버가 상권 -> 행정동을 해석해야 해서 Feign 이 섞인다.
     * 트랜잭션을 걸지 않는 사유는 클래스 javadoc 참고. (이슈 #415)
     */
    @Override
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
