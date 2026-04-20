package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationSalesServiceTopQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationStoreServiceTopQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialPeerStoreQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesByAgeGenderPercentQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.ComparisonMetricQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.PromptFormatterSupport;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportProcessor {

    private final CommercialAnalysisQueryPort commercialAnalysisQueryPort;
    private final DistrictAnalysisQueryPort districtAnalysisQueryPort;
    private final AdministrationAnalysisQueryPort administrationAnalysisQueryPort;
    private final RegionAnalysisQueryPort regionAnalysisQueryPort;
    private final AiLlmPort aiLlmPort;
    private final AiReportCachePort aiReportCachePort;
    private final AiLlmProperties aiLlmProperties;

    public CommercialAiReportInfo getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<CommercialAiReportInfo> cached = aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            logReport("commercial", commercialCode, periodCode, true, startTime);
            return cached.get();
        }

        CommercialAdministrationQueryResult administrationInfo = regionAnalysisQueryPort.getCommercialAdministration(commercialCode);
        var footTraffic = commercialAnalysisQueryPort.getCommercialFootTraffic(commercialCode, periodCode);
        var sales = commercialAnalysisQueryPort.getCommercialSales(commercialCode, serviceCode, periodCode);
        var facility = commercialAnalysisQueryPort.getCommercialFacility(commercialCode, periodCode);
        var population = commercialAnalysisQueryPort.getCommercialPopulation(commercialCode, periodCode);
        var income = commercialAnalysisQueryPort.getCommercialIncome(commercialCode, periodCode);
        var store = commercialAnalysisQueryPort.getCommercialStore(commercialCode, serviceCode, periodCode);
        var salesSummary = commercialAnalysisQueryPort.getCommercialSalesSummary(
            administrationInfo.districtCode(),
            administrationInfo.administrationCode(),
            commercialCode,
            serviceCode,
            periodCode
        );
        var incomeSummary = commercialAnalysisQueryPort.getCommercialIncomeSummary(
            administrationInfo.districtCode(),
            administrationInfo.administrationCode(),
            commercialCode,
            periodCode
        );
        CommercialAiSourceData sourceData = buildCommercialSourceData(
            commercialCode,
            serviceCode,
            periodCode,
            administrationInfo,
            footTraffic,
            sales,
            facility,
            population,
            income,
            store,
            salesSummary,
            incomeSummary
        );

        CommercialAiDraft draft = aiLlmPort.generateCommercialReport(sourceData);
        CommercialAiReportInfo reportInfo = new CommercialAiReportInfo(
            draft.summary(),
            draft.strengths(),
            draft.risks(),
            draft.recommendedBusinessCategories(),
            draft.recommendedCustomerSegments(),
            draft.recommendedOperatingHours(),
            draft.avoidOperatingHours(),
            draft.targetAgeGroups(),
            draft.targetGenders(),
            draft.operationTips(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveCommercialReport(commercialCode, serviceCode, periodCode, reportInfo);
        logReport("commercial", commercialCode, periodCode, false, startTime);
        return reportInfo;
    }

    public CommercialComparisonAiReportInfo getCommercialComparisonReport(CommercialComparisonAiQuery query) {
        String leftCommercialCode = query.leftCommercialCode();
        String rightCommercialCode = query.rightCommercialCode();
        String serviceCode = query.serviceCode();
        String periodCode = query.periodCode();

        long startTime = System.currentTimeMillis();
        Optional<CommercialComparisonAiReportInfo> cached = aiReportCachePort.getCommercialComparisonReport(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
        if (cached.isPresent()) {
            logReport("commercial-comparison", "%s:%s".formatted(leftCommercialCode, rightCommercialCode), periodCode, true, startTime);
            return cached.get();
        }

        CommercialComparisonQueryResult comparison = commercialAnalysisQueryPort.getCommercialComparison(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
        CommercialComparisonAiSourceData sourceData = buildCommercialComparisonSourceData(comparison, serviceCode, periodCode);
        CommercialComparisonAiDraft draft = aiLlmPort.generateCommercialComparisonReport(sourceData);
        CommercialComparisonAiReportInfo reportInfo = new CommercialComparisonAiReportInfo(
            draft.summary(),
            draft.recommendedSide(),
            draft.recommendedReasons(),
            draft.riskComparison(),
            draft.timeSlotInsight(),
            draft.customerSegmentInsight(),
            draft.operationStrategy(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveCommercialComparisonReport(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode,
            reportInfo
        );
        logReport("commercial-comparison", "%s:%s".formatted(leftCommercialCode, rightCommercialCode), periodCode, false, startTime);
        return reportInfo;
    }

    public DistrictAiReportInfo getDistrictReport(String districtCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<DistrictAiReportInfo> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            logReport("district", districtCode, periodCode, true, startTime);
            return cached.get();
        }

        DistrictAiSourceData sourceData = buildDistrictSourceData(districtCode, periodCode, districtAnalysisQueryPort.getDistrictDetail(districtCode, periodCode));
        DistrictAiDraft draft = aiLlmPort.generateDistrictReport(sourceData);
        DistrictAiReportInfo reportInfo = new DistrictAiReportInfo(
            draft.summary(),
            draft.marketStatus(),
            draft.recommendedBusinessCategories(),
            draft.cautionBusinessCategories(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveDistrictReport(districtCode, periodCode, reportInfo);
        logReport("district", districtCode, periodCode, false, startTime);
        return reportInfo;
    }

    public AdministrationAiReportInfo getAdministrationReport(String administrationCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<AdministrationAiReportInfo> cached = aiReportCachePort.getAdministrationReport(administrationCode, periodCode);
        if (cached.isPresent()) {
            logReport("administration", administrationCode, periodCode, true, startTime);
            return cached.get();
        }

        AdministrationAiSourceData sourceData = buildAdministrationSourceData(
            administrationCode,
            periodCode,
            regionAnalysisQueryPort.getAdministrationDistrict(administrationCode),
            administrationAnalysisQueryPort.getAdministrationDetail(administrationCode, periodCode),
            regionAnalysisQueryPort.getCommercialsByAdministration(administrationCode)
        );
        AdministrationAiDraft draft = aiLlmPort.generateAdministrationReport(sourceData);
        AdministrationAiReportInfo reportInfo = new AdministrationAiReportInfo(
            draft.summary(),
            draft.marketStatus(),
            draft.recommendedBusinessCategories(),
            draft.cautionBusinessCategories(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveAdministrationReport(administrationCode, periodCode, reportInfo);
        logReport("administration", administrationCode, periodCode, false, startTime);
        return reportInfo;
    }

    private void logReport(String reportType, String targetCode, String periodCode, boolean cacheHit, long startTime) {
        long latencyMs = System.currentTimeMillis() - startTime;
        log.info(
            "AI report generated reportType={} targetCode={} periodCode={} cacheHit={} latencyMs={} llmModel={}",
            reportType,
            targetCode,
            periodCode,
            cacheHit,
            latencyMs,
            aiLlmProperties.model()
        );
    }

    private CommercialAiSourceData buildCommercialSourceData(
        String commercialCode,
        String serviceCode,
        String periodCode,
        CommercialAdministrationQueryResult administrationInfo,
        CommercialFootTrafficQueryResult footTraffic,
        CommercialSalesQueryResult sales,
        CommercialFacilityQueryResult facility,
        CommercialResidentPopulationQueryResult population,
        CommercialIncomeAndExpenseQueryResult income,
        CommercialStoreAnalysisQueryResult store,
        CommercialSalesSummaryQueryResult salesSummary,
        CommercialIncomeSummaryQueryResult incomeSummary
    ) {
        CommercialSalesByAgeGenderPercentQueryResult salesPercent = sales.amountByAgeGenderPercent();

        return CommercialAiSourceData.builder()
            .commercialCode(commercialCode)
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .districtCode(administrationInfo.districtCode())
            .districtName(administrationInfo.districtName())
            .administrationCode(administrationInfo.administrationCode())
            .administrationName(administrationInfo.administrationName())
            .peakFootTrafficTimeSlot(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "00-06", footTraffic.byTimeSlot().footTrafficTime00To06(),
                "06-11", footTraffic.byTimeSlot().footTrafficTime06To11(),
                "11-14", footTraffic.byTimeSlot().footTrafficTime11To14(),
                "14-17", footTraffic.byTimeSlot().footTrafficTime14To17(),
                "17-21", footTraffic.byTimeSlot().footTrafficTime17To21(),
                "21-24", footTraffic.byTimeSlot().footTrafficTime21To24()
            )))
            .peakFootTrafficDayOfWeek(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "월", footTraffic.byDayOfWeek().mondayFootTraffic(),
                "화", footTraffic.byDayOfWeek().tuesdayFootTraffic(),
                "수", footTraffic.byDayOfWeek().wednesdayFootTraffic(),
                "목", footTraffic.byDayOfWeek().thursdayFootTraffic(),
                "금", footTraffic.byDayOfWeek().fridayFootTraffic(),
                "토", footTraffic.byDayOfWeek().saturdayFootTraffic(),
                "일", footTraffic.byDayOfWeek().sundayFootTraffic()
            )))
            .peakFootTrafficAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", footTraffic.byAgeGroup().age10FootTraffic(),
                "20대", footTraffic.byAgeGroup().age20FootTraffic(),
                "30대", footTraffic.byAgeGroup().age30FootTraffic(),
                "40대", footTraffic.byAgeGroup().age40FootTraffic(),
                "50대", footTraffic.byAgeGroup().age50FootTraffic(),
                "60대 이상", footTraffic.byAgeGroup().age60PlusFootTraffic()
            )))
            .peakSalesTimeSlot(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "00-06", sales.amountByTimeSlot().salesAmountTime00To06(),
                "06-11", sales.amountByTimeSlot().salesAmountTime06To11(),
                "11-14", sales.amountByTimeSlot().salesAmountTime11To14(),
                "14-17", sales.amountByTimeSlot().salesAmountTime14To17(),
                "17-21", sales.amountByTimeSlot().salesAmountTime17To21(),
                "21-24", sales.amountByTimeSlot().salesAmountTime21To24()
            )))
            .peakSalesDayOfWeek(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "월", sales.amountByDayOfWeek().mondaySalesAmount(),
                "화", sales.amountByDayOfWeek().tuesdaySalesAmount(),
                "수", sales.amountByDayOfWeek().wednesdaySalesAmount(),
                "목", sales.amountByDayOfWeek().thursdaySalesAmount(),
                "금", sales.amountByDayOfWeek().fridaySalesAmount(),
                "토", sales.amountByDayOfWeek().saturdaySalesAmount(),
                "일", sales.amountByDayOfWeek().sundaySalesAmount()
            )))
            .peakSalesAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", sales.amountByAge().age10SalesAmount(),
                "20대", sales.amountByAge().age20SalesAmount(),
                "30대", sales.amountByAge().age30SalesAmount(),
                "40대", sales.amountByAge().age40SalesAmount(),
                "50대", sales.amountByAge().age50SalesAmount(),
                "60대 이상", sales.amountByAge().age60PlusSalesAmount()
            )))
            .largestAgeGenderShare(PromptFormatterSupport.formatTopPercentEntry(PromptFormatterSupport.orderedPercentMap(
                "남성 10대", salesPercent.maleAge10Percent(),
                "여성 10대", salesPercent.femaleAge10Percent(),
                "남성 20대", salesPercent.maleAge20Percent(),
                "여성 20대", salesPercent.femaleAge20Percent(),
                "남성 30대", salesPercent.maleAge30Percent(),
                "여성 30대", salesPercent.femaleAge30Percent(),
                "남성 40대", salesPercent.maleAge40Percent(),
                "여성 40대", salesPercent.femaleAge40Percent(),
                "남성 50대", salesPercent.maleAge50Percent(),
                "여성 50대", salesPercent.femaleAge50Percent(),
                "남성 60대 이상", salesPercent.maleAge60PlusPercent(),
                "여성 60대 이상", salesPercent.femaleAge60PlusPercent()
            )))
            .totalFacilityCount(facility.totalFacilityCount())
            .schoolCount(facility.schoolCount().totalSchoolCount())
            .transportationFacilityCount(facility.totalTransportationFacilityCount())
            .totalResidentPopulationCount(population.totalResidentPopulationCount())
            .largestResidentAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", population.byAge().age10ResidentPopulation(),
                "20대", population.byAge().age20ResidentPopulation(),
                "30대", population.byAge().age30ResidentPopulation(),
                "40대", population.byAge().age40ResidentPopulation(),
                "50대", population.byAge().age50ResidentPopulation(),
                "60대 이상", population.byAge().age60PlusResidentPopulation()
            )))
            .averageMonthlyIncomeAmount(income.averageIncome().monthlyAverageIncomeAmount())
            .largestExpenseCategory(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "식료품", income.expenseByCategory().groceryExpenseAmount(),
                "의류", income.expenseByCategory().clothingExpenseAmount(),
                "의료", income.expenseByCategory().medicalExpenseAmount(),
                "생활용품", income.expenseByCategory().householdExpenseAmount(),
                "교통", income.expenseByCategory().transportationExpenseAmount(),
                "여가", income.expenseByCategory().leisureExpenseAmount(),
                "문화", income.expenseByCategory().cultureExpenseAmount(),
                "교육", income.expenseByCategory().educationExpenseAmount(),
                "유흥", income.expenseByCategory().entertainmentExpenseAmount()
            )))
            .totalStoreCount(store.totalStoreCount())
            .similarStoreCount(store.similarStoreCount())
            .openedStoreCount(store.openedStoreCount())
            .openingRate(store.openingRate())
            .closedStoreCount(store.closedStoreCount())
            .closureRate(store.closureRate())
            .franchiseStoreCount(store.franchiseStoreCount())
            .peerStoreSummaries(store.peerStores().stream().map(this::formatPeerStoreSummary).toList())
            .districtSalesAmount(salesSummary.district().monthlySalesAmount())
            .administrationSalesAmount(salesSummary.administration().monthlySalesAmount())
            .commercialSalesAmount(salesSummary.commercial().monthlySalesAmount())
            .districtExpenseAmount(incomeSummary.district().totalExpenseAmount())
            .administrationExpenseAmount(incomeSummary.administration().totalExpenseAmount())
            .commercialExpenseAmount(incomeSummary.commercial().totalExpenseAmount())
            .build();
    }

    private CommercialComparisonAiSourceData buildCommercialComparisonSourceData(
        CommercialComparisonQueryResult comparison,
        String serviceCode,
        String periodCode
    ) {
        return CommercialComparisonAiSourceData.builder()
            .leftCommercialCode(comparison.left().commercialCode())
            .leftCommercialName(comparison.left().commercialName())
            .leftDistrictName(comparison.left().districtName())
            .leftAdministrationName(comparison.left().administrationName())
            .rightCommercialCode(comparison.right().commercialCode())
            .rightCommercialName(comparison.right().commercialName())
            .rightDistrictName(comparison.right().districtName())
            .rightAdministrationName(comparison.right().administrationName())
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .comparisonSummary(comparison.comparisonSummary())
            .recommendedSide(comparison.recommendedSide() == null ? null : comparison.recommendedSide().code())
            .recommendedReasons(defaultList(comparison.recommendedReasons(), "추천 이유 데이터가 충분하지 않습니다."))
            .cautionPoints(defaultList(comparison.cautionPoints(), "두 상권의 경쟁 강도와 폐업률을 함께 확인하는 것이 좋습니다."))
            .dominantTimeSlots(defaultList(comparison.dominantTimeSlots(), "시간대 비교 데이터가 충분하지 않습니다."))
            .dominantAgeGroups(defaultList(comparison.dominantAgeGroups(), "연령대 비교 데이터가 충분하지 않습니다."))
            .businessFitSummary(comparison.businessFitSummary())
            .comparisonHighlights(defaultList(comparison.comparisonHighlights(), "비교 하이라이트 데이터가 충분하지 않습니다."))
            .salesMetricSummaries(toMetricSummaries(comparison.salesMetrics()))
            .footTrafficMetricSummaries(toMetricSummaries(comparison.footTrafficMetrics()))
            .storeMetricSummaries(toMetricSummaries(comparison.storeMetrics()))
            .spendingMetricSummaries(toMetricSummaries(comparison.spendingMetrics()))
            .residentPopulationMetricSummaries(toMetricSummaries(comparison.residentPopulationMetrics()))
            .facilityMetricSummaries(toMetricSummaries(comparison.facilityMetrics()))
            .salesTimeSlotMetricSummaries(toMetricSummaries(comparison.salesTimeSlotMetrics()))
            .salesAgeMetricSummaries(toMetricSummaries(comparison.salesAgeMetrics()))
            .salesAgeGenderMetricSummaries(toMetricSummaries(comparison.salesAgeGenderMetrics()))
            .footTrafficTimeSlotMetricSummaries(toMetricSummaries(comparison.footTrafficTimeSlotMetrics()))
            .footTrafficAgeMetricSummaries(toMetricSummaries(comparison.footTrafficAgeMetrics()))
            .footTrafficAgeGenderMetricSummaries(toMetricSummaries(comparison.footTrafficAgeGenderMetrics()))
            .build();
    }

    private DistrictAiSourceData buildDistrictSourceData(String districtCode, String periodCode, DistrictDetailQueryResult districtDetail) {
        return DistrictAiSourceData.builder()
            .districtCode(districtCode)
            .periodCode(periodCode)
            .changeIndicatorName(districtDetail.changeIndicator().changeIndicatorName())
            .averageOpenedMonths(String.valueOf(districtDetail.changeIndicator().averageOpenedMonths()))
            .averageClosedMonths(String.valueOf(districtDetail.changeIndicator().averageClosedMonths()))
            .footTrafficTrend(districtDetail.footTraffic().periodTrend().name())
            .dominantTimeSlot(districtDetail.footTraffic().timeSlot().dominantTimeSlotType().name())
            .dominantGender(districtDetail.footTraffic().gender().dominantGenderType().name())
            .topStoreServiceSummaries(districtDetail.store().topStoreServices().stream()
                .map(item -> "%s (점포 %s개)".formatted(item.serviceName(), PromptFormatterSupport.formatNumber(item.totalStoreCount())))
                .toList())
            .topOpenedAdministrationSummaries(districtDetail.store().topOpenedAdministrations().stream()
                .map(item -> "%s (개업 %s개, 개업률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.openedStoreCount()),
                    PromptFormatterSupport.formatPercent(item.openingRate())
                ))
                .toList())
            .topClosedAdministrationSummaries(districtDetail.store().topClosedAdministrations().stream()
                .map(item -> "%s (폐업 %s개, 폐업률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.closedStoreCount()),
                    PromptFormatterSupport.formatPercent(item.closureRate())
                ))
                .toList())
            .topSalesServiceSummaries(districtDetail.sales().topSalesServices().stream()
                .map(item -> "%s (증감률 %s)".formatted(item.serviceName(), PromptFormatterSupport.formatPercent(item.salesChangeRate())))
                .toList())
            .topSalesAdministrationSummaries(districtDetail.sales().topSalesAdministrations().stream()
                .map(item -> "%s (매출 %s, 증감률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.totalSalesAmount()),
                    PromptFormatterSupport.formatPercent(item.salesChangeRate())
                ))
                .toList())
            .build();
    }

    private AdministrationAiSourceData buildAdministrationSourceData(
        String administrationCode,
        String periodCode,
        AdministrationDistrictQueryResult districtInfo,
        AdministrationDetailQueryResult detail,
        List<AdministrationCommercialQueryResult> commercials
    ) {
        return AdministrationAiSourceData.builder()
            .administrationCode(administrationCode)
            .periodCode(periodCode)
            .districtCode(districtInfo.districtCode())
            .districtName(districtInfo.districtName())
            .administrationName(districtInfo.administrationName())
            .commercialCount(commercials.size())
            .commercialSummaries(commercials.stream().map(item -> "%s (%s)".formatted(item.commercialName(), item.commercialCode())).toList())
            .topSalesServiceSummaries(detail.sales().topSalesServices().stream().map(this::formatAdministrationSalesService).toList())
            .topStoreServiceSummaries(detail.store().topStoreServices().stream().map(this::formatAdministrationStoreService).toList())
            .totalExpenseAmount(detail.income().totalExpenseAmount())
            .build();
    }

    private List<String> toMetricSummaries(List<ComparisonMetricQueryResult> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return List.of("비교 지표 데이터가 충분하지 않습니다.");
        }
        return metrics.stream()
            .map(metric -> "%s: 좌측 %s, 우측 %s, 차이 %s, 우세 %s".formatted(
                metric.label(),
                formatMetricValue(metric.leftValue()),
                formatMetricValue(metric.rightValue()),
                formatMetricValue(metric.diffValue()),
                metric.winnerSide().name()
            ))
            .toList();
    }

    private String formatMetricValue(double value) {
        long rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.000001d) {
            return PromptFormatterSupport.formatNumber(rounded);
        }
        return "%.2f".formatted(value);
    }

    private List<String> defaultList(List<String> values, String fallback) {
        return values == null || values.isEmpty() ? List.of(fallback) : values;
    }

    private String formatPeerStoreSummary(CommercialPeerStoreQueryResult peerStore) {
        return "%s (점포 %s개, 개업률 %s, 폐업률 %s)".formatted(
            peerStore.serviceName(),
            PromptFormatterSupport.formatNumber(peerStore.totalStoreCount()),
            PromptFormatterSupport.formatPercent(peerStore.openingRate()),
            PromptFormatterSupport.formatPercent(peerStore.closureRate())
        );
    }

    private String formatAdministrationSalesService(AdministrationSalesServiceTopQueryResult item) {
        return "%s (매출 %s, 증감률 %s)".formatted(
            item.serviceName(),
            PromptFormatterSupport.formatNumber(item.monthlySalesAmount()),
            PromptFormatterSupport.formatPercent(item.salesChangeRate())
        );
    }

    private String formatAdministrationStoreService(AdministrationStoreServiceTopQueryResult item) {
        return "%s (점포 %s개, 개업률 %s, 폐업률 %s)".formatted(
            item.serviceName(),
            PromptFormatterSupport.formatNumber(item.totalStoreCount()),
            PromptFormatterSupport.formatPercent(item.openingRate()),
            PromptFormatterSupport.formatPercent(item.closureRate())
        );
    }
}
