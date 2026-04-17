package com.followfollowme.nowdoboss.domainlayer.commercial.application.service;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparisonResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialBenchmarkResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialHeatmapScoresResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor.CommercialComparisonQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor.CommercialBenchmarkQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor.CommercialHeatmapQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor.CommercialQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.commercialsummary.adapter.in.web.presenter.CommercialSummaryPresenter;
import com.followfollowme.nowdoboss.domainlayer.commercialsummary.application.service.processor.CommercialSummaryQueryProcessor;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommercialWebFacade implements CommercialWebUseCase {

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialComparisonQueryProcessor commercialComparisonQueryProcessor;
    private final CommercialBenchmarkQueryProcessor commercialBenchmarkQueryProcessor;
    private final CommercialHeatmapQueryProcessor commercialHeatmapQueryProcessor;
    private final CommercialPresenter commercialPresenter;
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
        return commercialPresenter.toCommercialFootTrafficResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo info = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
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
        String periodCode,
        String commercialCode,
        String serviceCode
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
        String periodCode,
        String serviceCode,
        List<String> commercialCodes,
        CommercialHeatmapMetricType metricType
    ) {
        List<CommercialHeatmapScoreInfo> infos = commercialHeatmapQueryProcessor.getHeatmapScores(
            periodCode,
            serviceCode,
            commercialCodes,
            metricType
        );
        return commercialPresenter.toCommercialHeatmapScoresResponse(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesSummaryResponse getSalesSummary(
        String periodCode,
        String districtCode,
        String administrationCode,
        String commercialCode,
        String serviceCode
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
        String periodCode,
        String districtCode,
        String administrationCode,
        String commercialCode
    ) {
        CommercialIncomeSummaryInfo info = commercialSummaryQueryProcessor.getIncomeSummary(
            periodCode,
            districtCode,
            administrationCode,
            commercialCode
        );
        return commercialSummaryPresenter.toCommercialIncomeSummaryResponse(info);
    }
}
