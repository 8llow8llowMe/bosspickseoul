package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CandidateCommercialItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAverageIncomeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialComparisonTargetItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseByCategoryItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGroupItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialResidentPopulationByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialPeerStoreItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialHeatmapScoreItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ComparisonMetricItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.RegionalIncomeSummaryItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.RegionalSalesSummaryItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.MetricBreakdownItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByGenderItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparisonResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialBenchmarkResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialHeatmapScoresResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate.CandidateCommercialInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate.CandidateCommercialsResponseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate.MetricBreakdownInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile.CommercialProfileKeyMetricsInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialSchoolCountInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGroupInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialAverageIncomeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByGenderInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialPeerStoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.PolicyRecommendationItem;
import com.followfollowme.nowdoboss.domainlayer.policy.application.info.PolicyRecommendationInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommercialPresenter {

    public CommercialServiceCategoryResponse toCommercialServiceCategoryResponse(CommercialServiceCategoryInfo info) {
        return CommercialServiceCategoryResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .serviceType(info.serviceType().toMetadata())
            .build();
    }

    public List<CommercialServiceCategoryResponse> toCommercialServiceCategoryResponses(List<CommercialServiceCategoryInfo> infos) {
        return infos.stream()
            .map(this::toCommercialServiceCategoryResponse)
            .toList();
    }

    public CommercialFootTrafficResponse toCommercialFootTrafficResponse(CommercialFootTrafficInfo info) {
        return CommercialFootTrafficResponse.builder()
            .byTimeSlotItem(toCommercialFootTrafficByTimeSlotItem(info.byTimeSlotInfo()))
            .byDayOfWeekItem(toCommercialFootTrafficByDayOfWeekItem(info.byDayOfWeekInfo()))
            .byAgeGroupItem(toCommercialFootTrafficByAgeGroupItem(info.byAgeGroupInfo()))
            .byAgeGenderPercentItem(toCommercialFootTrafficByAgeGenderPercentItem(info.byAgeGenderPercentInfo()))
            .build();
    }

    public CommercialResidentPopulationResponse toCommercialPopulationResponse(CommercialResidentPopulationInfo info) {
        return CommercialResidentPopulationResponse.builder()
            .byAgeItem(toCommercialResidentPopulationByAgeItem(info.byAgeInfo()))
            .malePercentage(info.malePercentage())
            .femalePercentage(info.femalePercentage())
            .build();
    }

    public CommercialIncomeAndExpenseResponse toCommercialIncomeResponse(CommercialIncomeAndExpenseInfo info) {
        return CommercialIncomeAndExpenseResponse.builder()
            .averageIncomeItem(toCommercialAverageIncomeItem(info.averageIncomeInfo()))
            .expenseByCategoryItem(toCommercialExpenseByCategoryItem(info.expenseByCategoryInfo()))
            .build();
    }

    public CommercialSalesResponse toCommercialSalesResponse(CommercialSalesInfo info) {
        return CommercialSalesResponse.builder()
            .amountByTimeSlotItem(toCommercialSalesByTimeSlotItem(info.amountByTimeSlotInfo()))
            .amountByDayOfWeekItem(toCommercialSalesByDayOfWeekItem(info.amountByDayOfWeekInfo()))
            .amountByAgeItem(toCommercialSalesByAgeItem(info.amountByAgeInfo()))
            .amountByAgeGenderPercentItem(toCommercialSalesByAgeGenderPercentItem(info.amountByAgeGenderPercentInfo()))
            .countByDayOfWeekItem(toCommercialSalesCountByDayOfWeekItem(info.countByDayOfWeekInfo()))
            .countByTimeSlotItem(toCommercialSalesCountByTimeSlotItem(info.countByTimeSlotInfo()))
            .countByGenderItem(toCommercialSalesCountByGenderItem(info.countByGenderInfo()))
            .build();
    }

    public CommercialFacilityResponse toCommercialFacilityResponse(CommercialFacilityInfo info) {
        return CommercialFacilityResponse.builder()
            .totalFacilityCount(info.totalFacilityCount())
            .schoolCountItem(toCommercialSchoolCountItem(info.schoolCountInfo()))
            .totalTransportationFacilityCount(info.totalTransportationFacilityCount())
            .build();
    }

    public CommercialStoreAnalysisResponse toCommercialStoreAnalysisResponse(CommercialStoreAnalysisInfo info) {
        return CommercialStoreAnalysisResponse.builder()
            .totalStoreCount(info.totalStoreCount())
            .similarStoreCount(info.similarStoreCount())
            .openingRate(info.openingRate())
            .openedStoreCount(info.openedStoreCount())
            .closureRate(info.closureRate())
            .closedStoreCount(info.closedStoreCount())
            .franchiseStoreCount(info.franchiseStoreCount())
            .peerStores(info.peerStores().stream().map(this::toCommercialPeerStoreItem).toList())
            .build();
    }

    public CommercialComparisonResponse toCommercialComparisonResponse(CommercialComparisonInfo info) {
        return CommercialComparisonResponse.builder()
            .left(toCommercialComparisonTargetItem(info.left()))
            .right(toCommercialComparisonTargetItem(info.right()))
            .comparisonSummary(info.comparisonSummary())
            .recommendedSide(info.recommendedSide())
            .recommendedReasons(info.recommendedReasons())
            .cautionPoints(info.cautionPoints())
            .dominantTimeSlots(info.dominantTimeSlots())
            .dominantAgeGroups(info.dominantAgeGroups())
            .businessFitSummary(info.businessFitSummary())
            .salesMetrics(toComparisonMetricItems(info.salesMetrics()))
            .footTrafficMetrics(toComparisonMetricItems(info.footTrafficMetrics()))
            .storeMetrics(toComparisonMetricItems(info.storeMetrics()))
            .spendingMetrics(toComparisonMetricItems(info.spendingMetrics()))
            .residentPopulationMetrics(toComparisonMetricItems(info.residentPopulationMetrics()))
            .facilityMetrics(toComparisonMetricItems(info.facilityMetrics()))
            .salesTimeSlotMetrics(toComparisonMetricItems(info.salesTimeSlotMetrics()))
            .salesAgeMetrics(toComparisonMetricItems(info.salesAgeMetrics()))
            .salesAgeGenderMetrics(toComparisonMetricItems(info.salesAgeGenderMetrics()))
            .footTrafficTimeSlotMetrics(toComparisonMetricItems(info.footTrafficTimeSlotMetrics()))
            .footTrafficAgeMetrics(toComparisonMetricItems(info.footTrafficAgeMetrics()))
            .footTrafficAgeGenderMetrics(toComparisonMetricItems(info.footTrafficAgeGenderMetrics()))
            .comparisonHighlights(info.comparisonHighlights())
            .highlights(info.highlights())
            .build();
    }

    public CommercialBenchmarkResponse toCommercialBenchmarkResponse(CommercialBenchmarkInfo info) {
        return CommercialBenchmarkResponse.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .summary(info.summary())
            .salesSummary(toCommercialSalesSummaryResponse(info.salesSummary()))
            .incomeSummary(toCommercialIncomeSummaryResponse(info.incomeSummary()))
            .benchmarkHighlights(info.benchmarkHighlights())
            .build();
    }

    public CommercialHeatmapScoresResponse toCommercialHeatmapScoresResponse(CommercialHeatmapScoresResponseInfo info) {
        return CommercialHeatmapScoresResponse.builder()
            .mode(info.mode())
            .serviceCode(info.serviceCode())
            .periodCode(info.periodCode())
            .metricType(info.metricType())
            .preset(info.preset())
            .priorityMetric(info.priorityMetric())
            .summary(info.summary())
            .scores(info.scores().stream().map(this::toCommercialHeatmapScoreItem).toList())
            .build();
    }

    public CandidateCommercialsResponse toCandidateCommercialsResponse(CandidateCommercialsResponseInfo info) {
        return CandidateCommercialsResponse.builder()
            .serviceCode(info.serviceCode())
            .periodCode(info.periodCode())
            .preset(info.preset())
            .priorityMetric(info.priorityMetric())
            .topN(info.topN())
            .summary(info.summary())
            .items(info.items().stream().map(this::toCandidateCommercialItem).toList())
            .build();
    }

    public CommercialProfileResponse toCommercialProfileResponse(CommercialProfileInfo info) {
        return CommercialProfileResponse.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .keyMetrics(toCommercialProfileKeyMetricsItem(info.keyMetrics()))
            .policyRecommendations(
                info.policyRecommendations() == null
                    ? List.of()
                    : info.policyRecommendations().stream().map(this::toPolicyRecommendationItem).toList()
            )
            .build();
    }

    public CommercialComparePreviewResponse toCommercialComparePreviewResponse(CommercialComparePreviewInfo info) {
        return CommercialComparePreviewResponse.builder()
            .left(toCommercialComparisonTargetItem(info.left()))
            .right(toCommercialComparisonTargetItem(info.right()))
            .recommendedSide(info.recommendedSide())
            .headlineMetrics(toComparisonMetricItems(info.headlineMetrics()))
            .insightOneLiner(info.insightOneLiner())
            .build();
    }

    private PolicyRecommendationItem toPolicyRecommendationItem(PolicyRecommendationInfo info) {
        return PolicyRecommendationItem.builder()
            .policyId(info.policyId())
            .policyName(info.policyName())
            .provider(info.provider())
            .targetSummary(info.targetSummary())
            .supportSummary(info.supportSummary())
            .matchingReason(info.matchingReason())
            .applicationPeriod(info.applicationPeriod())
            .referenceUrl(info.referenceUrl())
            .build();
    }

    private CommercialProfileKeyMetricsItem toCommercialProfileKeyMetricsItem(CommercialProfileKeyMetricsInfo info) {
        return CommercialProfileKeyMetricsItem.builder()
            .totalSalesAmount(info.totalSalesAmount())
            .totalFootTraffic(info.totalFootTraffic())
            .totalStoreCount(info.totalStoreCount())
            .similarStoreCount(info.similarStoreCount())
            .openingRate(info.openingRate())
            .closureRate(info.closureRate())
            .totalResidentPopulation(info.totalResidentPopulation())
            .monthlyAverageIncomeAmount(info.monthlyAverageIncomeAmount())
            .totalFacilityCount(info.totalFacilityCount())
            .build();
    }

    private CandidateCommercialItem toCandidateCommercialItem(CandidateCommercialInfo info) {
        return CandidateCommercialItem.builder()
            .rank(info.rank())
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .compositeScore(info.compositeScore())
            .grade(info.grade())
            .summaryLabel(info.summaryLabel())
            .selectionReason(info.selectionReason())
            .opportunityLabel(info.opportunityLabel())
            .riskLabel(info.riskLabel())
            .metricBreakdown(info.metricBreakdown().stream().map(this::toMetricBreakdownItem).toList())
            .reasonTags(info.reasonTags())
            .build();
    }

    private MetricBreakdownItem toMetricBreakdownItem(MetricBreakdownInfo info) {
        return MetricBreakdownItem.builder()
            .metricType(info.metricType())
            .score(info.score())
            .grade(info.grade())
            .summaryLabel(info.summaryLabel())
            .build();
    }

    public CommercialSalesSummaryResponse toCommercialSalesSummaryResponse(CommercialSalesSummaryInfo info) {
        return CommercialSalesSummaryResponse.builder()
            .district(toRegionalSalesSummaryItem(info.district()))
            .administration(toRegionalSalesSummaryItem(info.administration()))
            .commercial(toRegionalSalesSummaryItem(info.commercial()))
            .build();
    }

    public CommercialIncomeSummaryResponse toCommercialIncomeSummaryResponse(CommercialIncomeSummaryInfo info) {
        return CommercialIncomeSummaryResponse.builder()
            .district(toRegionalIncomeSummaryItem(info.district()))
            .administration(toRegionalIncomeSummaryItem(info.administration()))
            .commercial(toRegionalIncomeSummaryItem(info.commercial()))
            .build();
    }

    // FootTraffic Item Mappers
    private CommercialFootTrafficByTimeSlotItem toCommercialFootTrafficByTimeSlotItem(CommercialFootTrafficByTimeSlotInfo info) {
        return CommercialFootTrafficByTimeSlotItem.builder()
            .footTrafficTime00To06(info.footTrafficTime00To06())
            .footTrafficTime06To11(info.footTrafficTime06To11())
            .footTrafficTime11To14(info.footTrafficTime11To14())
            .footTrafficTime14To17(info.footTrafficTime14To17())
            .footTrafficTime17To21(info.footTrafficTime17To21())
            .footTrafficTime21To24(info.footTrafficTime21To24())
            .build();
    }

    private CommercialFootTrafficByDayOfWeekItem toCommercialFootTrafficByDayOfWeekItem(CommercialFootTrafficByDayOfWeekInfo info) {
        return CommercialFootTrafficByDayOfWeekItem.builder()
            .mondayFootTraffic(info.mondayFootTraffic())
            .tuesdayFootTraffic(info.tuesdayFootTraffic())
            .wednesdayFootTraffic(info.wednesdayFootTraffic())
            .thursdayFootTraffic(info.thursdayFootTraffic())
            .fridayFootTraffic(info.fridayFootTraffic())
            .saturdayFootTraffic(info.saturdayFootTraffic())
            .sundayFootTraffic(info.sundayFootTraffic())
            .build();
    }

    private CommercialFootTrafficByAgeGroupItem toCommercialFootTrafficByAgeGroupItem(CommercialFootTrafficByAgeGroupInfo info) {
        return CommercialFootTrafficByAgeGroupItem.builder()
            .age10FootTraffic(info.age10FootTraffic())
            .age20FootTraffic(info.age20FootTraffic())
            .age30FootTraffic(info.age30FootTraffic())
            .age40FootTraffic(info.age40FootTraffic())
            .age50FootTraffic(info.age50FootTraffic())
            .age60PlusFootTraffic(info.age60PlusFootTraffic())
            .build();
    }

    private CommercialFootTrafficByAgeGenderPercentItem toCommercialFootTrafficByAgeGenderPercentItem(
        CommercialFootTrafficByAgeGenderPercentInfo info
    ) {
        return CommercialFootTrafficByAgeGenderPercentItem.builder()
            .maleAge10Percent(info.maleAge10Percent())
            .femaleAge10Percent(info.femaleAge10Percent())
            .maleAge20Percent(info.maleAge20Percent())
            .femaleAge20Percent(info.femaleAge20Percent())
            .maleAge30Percent(info.maleAge30Percent())
            .femaleAge30Percent(info.femaleAge30Percent())
            .maleAge40Percent(info.maleAge40Percent())
            .femaleAge40Percent(info.femaleAge40Percent())
            .maleAge50Percent(info.maleAge50Percent())
            .femaleAge50Percent(info.femaleAge50Percent())
            .maleAge60PlusPercent(info.maleAge60PlusPercent())
            .femaleAge60PlusPercent(info.femaleAge60PlusPercent())
            .build();
    }

    // Sales Item Mappers
    private CommercialSalesByTimeSlotItem toCommercialSalesByTimeSlotItem(CommercialSalesByTimeSlotInfo info) {
        return CommercialSalesByTimeSlotItem.builder()
            .salesAmountTime00To06(info.salesAmountTime00To06())
            .salesAmountTime06To11(info.salesAmountTime06To11())
            .salesAmountTime11To14(info.salesAmountTime11To14())
            .salesAmountTime14To17(info.salesAmountTime14To17())
            .salesAmountTime17To21(info.salesAmountTime17To21())
            .salesAmountTime21To24(info.salesAmountTime21To24())
            .build();
    }

    private CommercialSalesByDayOfWeekItem toCommercialSalesByDayOfWeekItem(CommercialSalesByDayOfWeekInfo info) {
        return CommercialSalesByDayOfWeekItem.builder()
            .mondaySalesAmount(info.mondaySalesAmount())
            .tuesdaySalesAmount(info.tuesdaySalesAmount())
            .wednesdaySalesAmount(info.wednesdaySalesAmount())
            .thursdaySalesAmount(info.thursdaySalesAmount())
            .fridaySalesAmount(info.fridaySalesAmount())
            .saturdaySalesAmount(info.saturdaySalesAmount())
            .sundaySalesAmount(info.sundaySalesAmount())
            .build();
    }

    private CommercialSalesByAgeItem toCommercialSalesByAgeItem(CommercialSalesByAgeInfo info) {
        return CommercialSalesByAgeItem.builder()
            .age10SalesAmount(info.age10SalesAmount())
            .age20SalesAmount(info.age20SalesAmount())
            .age30SalesAmount(info.age30SalesAmount())
            .age40SalesAmount(info.age40SalesAmount())
            .age50SalesAmount(info.age50SalesAmount())
            .age60PlusSalesAmount(info.age60PlusSalesAmount())
            .build();
    }

    private CommercialSalesByAgeGenderPercentItem toCommercialSalesByAgeGenderPercentItem(CommercialSalesByAgeGenderPercentInfo info) {
        return CommercialSalesByAgeGenderPercentItem.builder()
            .maleAge10Percent(info.maleAge10Percent())
            .femaleAge10Percent(info.femaleAge10Percent())
            .maleAge20Percent(info.maleAge20Percent())
            .femaleAge20Percent(info.femaleAge20Percent())
            .maleAge30Percent(info.maleAge30Percent())
            .femaleAge30Percent(info.femaleAge30Percent())
            .maleAge40Percent(info.maleAge40Percent())
            .femaleAge40Percent(info.femaleAge40Percent())
            .maleAge50Percent(info.maleAge50Percent())
            .femaleAge50Percent(info.femaleAge50Percent())
            .maleAge60PlusPercent(info.maleAge60PlusPercent())
            .femaleAge60PlusPercent(info.femaleAge60PlusPercent())
            .build();
    }

    private CommercialSalesCountByDayOfWeekItem toCommercialSalesCountByDayOfWeekItem(CommercialSalesCountByDayOfWeekInfo info) {
        return CommercialSalesCountByDayOfWeekItem.builder()
            .mondaySalesCount(info.mondaySalesCount())
            .tuesdaySalesCount(info.tuesdaySalesCount())
            .wednesdaySalesCount(info.wednesdaySalesCount())
            .thursdaySalesCount(info.thursdaySalesCount())
            .fridaySalesCount(info.fridaySalesCount())
            .saturdaySalesCount(info.saturdaySalesCount())
            .sundaySalesCount(info.sundaySalesCount())
            .build();
    }

    private CommercialSalesCountByTimeSlotItem toCommercialSalesCountByTimeSlotItem(CommercialSalesCountByTimeSlotInfo info) {
        return CommercialSalesCountByTimeSlotItem.builder()
            .salesCountTime00To06(info.salesCountTime00To06())
            .salesCountTime06To11(info.salesCountTime06To11())
            .salesCountTime11To14(info.salesCountTime11To14())
            .salesCountTime14To17(info.salesCountTime14To17())
            .salesCountTime17To21(info.salesCountTime17To21())
            .salesCountTime21To24(info.salesCountTime21To24())
            .build();
    }

    private CommercialSalesCountByGenderItem toCommercialSalesCountByGenderItem(CommercialSalesCountByGenderInfo info) {
        return CommercialSalesCountByGenderItem.builder()
            .maleSalesCount(info.maleSalesCount())
            .femaleSalesCount(info.femaleSalesCount())
            .build();
    }

    // Facility Item Mappers
    private CommercialSchoolCountItem toCommercialSchoolCountItem(CommercialSchoolCountInfo info) {
        return CommercialSchoolCountItem.builder()
            .elementarySchoolCount(info.elementarySchoolCount())
            .middleSchoolCount(info.middleSchoolCount())
            .highSchoolCount(info.highSchoolCount())
            .universityCount(info.universityCount())
            .totalSchoolCount(info.totalSchoolCount())
            .build();
    }

    // Population Item Mappers
    private CommercialResidentPopulationByAgeItem toCommercialResidentPopulationByAgeItem(CommercialResidentPopulationByAgeInfo info) {
        return CommercialResidentPopulationByAgeItem.builder()
            .totalResidentPopulation(info.totalResidentPopulation())
            .age10ResidentPopulation(info.age10ResidentPopulation())
            .age20ResidentPopulation(info.age20ResidentPopulation())
            .age30ResidentPopulation(info.age30ResidentPopulation())
            .age40ResidentPopulation(info.age40ResidentPopulation())
            .age50ResidentPopulation(info.age50ResidentPopulation())
            .age60PlusResidentPopulation(info.age60PlusResidentPopulation())
            .build();
    }

    // Income Item Mappers
    private CommercialAverageIncomeItem toCommercialAverageIncomeItem(CommercialAverageIncomeInfo info) {
        return CommercialAverageIncomeItem.builder()
            .monthlyAverageIncomeAmount(info.monthlyAverageIncomeAmount())
            .incomeBracketCode(info.incomeBracketCode())
            .build();
    }

    private CommercialExpenseByCategoryItem toCommercialExpenseByCategoryItem(CommercialExpenseByCategoryInfo info) {
        return CommercialExpenseByCategoryItem.builder()
            .groceryExpenseAmount(info.groceryExpenseAmount())
            .clothingExpenseAmount(info.clothingExpenseAmount())
            .medicalExpenseAmount(info.medicalExpenseAmount())
            .householdExpenseAmount(info.householdExpenseAmount())
            .transportationExpenseAmount(info.transportationExpenseAmount())
            .leisureExpenseAmount(info.leisureExpenseAmount())
            .cultureExpenseAmount(info.cultureExpenseAmount())
            .educationExpenseAmount(info.educationExpenseAmount())
            .entertainmentExpenseAmount(info.entertainmentExpenseAmount())
            .build();
    }

    private CommercialPeerStoreItem toCommercialPeerStoreItem(CommercialPeerStoreInfo info) {
        return CommercialPeerStoreItem.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .totalStoreCount(info.totalStoreCount())
            .openingRate(info.openingRate())
            .closureRate(info.closureRate())
            .build();
    }

    private RegionalSalesSummaryItem toRegionalSalesSummaryItem(RegionalSalesSummaryInfo info) {
        return RegionalSalesSummaryItem.builder()
            .code(info.code())
            .name(info.name())
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .monthlySalesAmount(info.monthlySalesAmount())
            .build();
    }

    private RegionalIncomeSummaryItem toRegionalIncomeSummaryItem(RegionalIncomeSummaryInfo info) {
        return RegionalIncomeSummaryItem.builder()
            .code(info.code())
            .name(info.name())
            .totalExpenseAmount(info.totalExpenseAmount())
            .build();
    }

    private CommercialComparisonTargetItem toCommercialComparisonTargetItem(CommercialComparisonTargetInfo info) {
        return CommercialComparisonTargetItem.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .build();
    }

    private List<ComparisonMetricItem> toComparisonMetricItems(List<ComparisonMetricInfo> infos) {
        return infos.stream().map(this::toComparisonMetricItem).toList();
    }

    private ComparisonMetricItem toComparisonMetricItem(ComparisonMetricInfo info) {
        return ComparisonMetricItem.builder()
            .label(info.label())
            .leftValue(info.leftValue())
            .rightValue(info.rightValue())
            .diffValue(info.diffValue())
            .diffRate(info.diffRate())
            .winnerSide(info.winnerSide())
            .build();
    }

    private CommercialHeatmapScoreItem toCommercialHeatmapScoreItem(CommercialHeatmapScoreInfo info) {
        return CommercialHeatmapScoreItem.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .metricType(info.metricType())
            .score(info.score())
            .grade(info.grade())
            .summaryLabel(info.summaryLabel())
            .build();
    }
}
