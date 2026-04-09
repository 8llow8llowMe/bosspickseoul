package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
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
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt.PromptFormatterSupport;
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
        var salesSummary = commercialAnalysisQueryPort.getCommercialSalesSummary(administrationInfo.districtCode(), administrationInfo.administrationCode(), commercialCode, serviceCode, periodCode);
        var incomeSummary = commercialAnalysisQueryPort.getCommercialIncomeSummary(administrationInfo.districtCode(), administrationInfo.administrationCode(), commercialCode, periodCode);
        CommercialAiSourceData sourceData = buildCommercialSourceData(commercialCode, serviceCode, periodCode, administrationInfo, footTraffic, sales, facility, population, income, store, salesSummary, incomeSummary);

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

    public DistrictAiReportInfo getDistrictReport(String districtCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<DistrictAiReportInfo> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            logReport("district", districtCode, periodCode, true, startTime);
            return cached.get();
        }

        DistrictAiSourceData sourceData = buildDistrictSourceData(districtCode, periodCode, districtAnalysisQueryPort.getDistrictDetail(districtCode, periodCode));
        DistrictAiDraft draft = aiLlmPort.generateDistrictReport(sourceData);
        DistrictAiReportInfo reportInfo = new DistrictAiReportInfo(draft.summary(), draft.marketStatus(), draft.recommendedBusinessCategories(), draft.cautionBusinessCategories(), draft.businessInsight(), LocalDateTime.now());
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
        AdministrationAiReportInfo reportInfo = new AdministrationAiReportInfo(draft.summary(), draft.marketStatus(), draft.recommendedBusinessCategories(), draft.cautionBusinessCategories(), draft.businessInsight(), LocalDateTime.now());
        aiReportCachePort.saveAdministrationReport(administrationCode, periodCode, reportInfo);
        logReport("administration", administrationCode, periodCode, false, startTime);
        return reportInfo;
    }

    private void logReport(String reportType, String targetCode, String periodCode, boolean cacheHit, long startTime) {
        long latencyMs = System.currentTimeMillis() - startTime;
        log.info("AI report generated reportType={} targetCode={} periodCode={} cacheHit={} latencyMs={} llmModel={}", reportType, targetCode, periodCode, cacheHit, latencyMs, aiLlmProperties.model());
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
            .peakFootTrafficTimeSlot(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("00-06", footTraffic.byTimeSlot().footTrafficTime00To06(), "06-11", footTraffic.byTimeSlot().footTrafficTime06To11(), "11-14", footTraffic.byTimeSlot().footTrafficTime11To14(), "14-17", footTraffic.byTimeSlot().footTrafficTime14To17(), "17-21", footTraffic.byTimeSlot().footTrafficTime17To21(), "21-24", footTraffic.byTimeSlot().footTrafficTime21To24())))
            .peakFootTrafficDayOfWeek(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("Mon", footTraffic.byDayOfWeek().mondayFootTraffic(), "Tue", footTraffic.byDayOfWeek().tuesdayFootTraffic(), "Wed", footTraffic.byDayOfWeek().wednesdayFootTraffic(), "Thu", footTraffic.byDayOfWeek().thursdayFootTraffic(), "Fri", footTraffic.byDayOfWeek().fridayFootTraffic(), "Sat", footTraffic.byDayOfWeek().saturdayFootTraffic(), "Sun", footTraffic.byDayOfWeek().sundayFootTraffic())))
            .peakFootTrafficAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("10s", footTraffic.byAgeGroup().age10FootTraffic(), "20s", footTraffic.byAgeGroup().age20FootTraffic(), "30s", footTraffic.byAgeGroup().age30FootTraffic(), "40s", footTraffic.byAgeGroup().age40FootTraffic(), "50s", footTraffic.byAgeGroup().age50FootTraffic(), "60+", footTraffic.byAgeGroup().age60PlusFootTraffic())))
            .peakSalesTimeSlot(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("00-06", sales.amountByTimeSlot().salesAmountTime00To06(), "06-11", sales.amountByTimeSlot().salesAmountTime06To11(), "11-14", sales.amountByTimeSlot().salesAmountTime11To14(), "14-17", sales.amountByTimeSlot().salesAmountTime14To17(), "17-21", sales.amountByTimeSlot().salesAmountTime17To21(), "21-24", sales.amountByTimeSlot().salesAmountTime21To24())))
            .peakSalesDayOfWeek(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("Mon", sales.amountByDayOfWeek().mondaySalesAmount(), "Tue", sales.amountByDayOfWeek().tuesdaySalesAmount(), "Wed", sales.amountByDayOfWeek().wednesdaySalesAmount(), "Thu", sales.amountByDayOfWeek().thursdaySalesAmount(), "Fri", sales.amountByDayOfWeek().fridaySalesAmount(), "Sat", sales.amountByDayOfWeek().saturdaySalesAmount(), "Sun", sales.amountByDayOfWeek().sundaySalesAmount())))
            .peakSalesAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("10s", sales.amountByAge().age10SalesAmount(), "20s", sales.amountByAge().age20SalesAmount(), "30s", sales.amountByAge().age30SalesAmount(), "40s", sales.amountByAge().age40SalesAmount(), "50s", sales.amountByAge().age50SalesAmount(), "60+", sales.amountByAge().age60PlusSalesAmount())))
            .largestAgeGenderShare(PromptFormatterSupport.formatTopPercentEntry(PromptFormatterSupport.orderedPercentMap("Male 10s", salesPercent.maleAge10Percent(), "Female 10s", salesPercent.femaleAge10Percent(), "Male 20s", salesPercent.maleAge20Percent(), "Female 20s", salesPercent.femaleAge20Percent(), "Male 30s", salesPercent.maleAge30Percent(), "Female 30s", salesPercent.femaleAge30Percent(), "Male 40s", salesPercent.maleAge40Percent(), "Female 40s", salesPercent.femaleAge40Percent(), "Male 50s", salesPercent.maleAge50Percent(), "Female 50s", salesPercent.femaleAge50Percent(), "Male 60+", salesPercent.maleAge60PlusPercent(), "Female 60+", salesPercent.femaleAge60PlusPercent())))
            .totalFacilityCount(facility.totalFacilityCount())
            .schoolCount(facility.schoolCount().totalSchoolCount())
            .transportationFacilityCount(facility.totalTransportationFacilityCount())
            .totalResidentPopulationCount(population.totalResidentPopulationCount())
            .largestResidentAgeGroup(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("10s", population.byAge().age10ResidentPopulation(), "20s", population.byAge().age20ResidentPopulation(), "30s", population.byAge().age30ResidentPopulation(), "40s", population.byAge().age40ResidentPopulation(), "50s", population.byAge().age50ResidentPopulation(), "60+", population.byAge().age60PlusResidentPopulation())))
            .averageMonthlyIncomeAmount(income.averageIncome().monthlyAverageIncomeAmount())
            .largestExpenseCategory(PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap("Grocery", income.expenseByCategory().groceryExpenseAmount(), "Clothing", income.expenseByCategory().clothingExpenseAmount(), "Medical", income.expenseByCategory().medicalExpenseAmount(), "Household", income.expenseByCategory().householdExpenseAmount(), "Transport", income.expenseByCategory().transportationExpenseAmount(), "Leisure", income.expenseByCategory().leisureExpenseAmount(), "Culture", income.expenseByCategory().cultureExpenseAmount(), "Education", income.expenseByCategory().educationExpenseAmount(), "Entertainment", income.expenseByCategory().entertainmentExpenseAmount())))
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

    private DistrictAiSourceData buildDistrictSourceData(String districtCode, String periodCode, DistrictDetailQueryResult districtDetail) {
        return DistrictAiSourceData.builder()
            .districtCode(districtCode)
            .periodCode(periodCode)
            .changeIndicatorName(districtDetail.changeIndicator().changeIndicatorName())
            .averageOpenedMonths(String.valueOf(districtDetail.changeIndicator().averageOpenedMonths()))
            .averageClosedMonths(String.valueOf(districtDetail.changeIndicator().averageClosedMonths()))
            .footTrafficTrend(String.valueOf(districtDetail.footTraffic().periodTrend()))
            .dominantTimeSlot(String.valueOf(districtDetail.footTraffic().timeSlot().dominantTimeSlotType()))
            .dominantGender(String.valueOf(districtDetail.footTraffic().gender().dominantGenderType()))
            .topStoreServiceSummaries(districtDetail.store().topStoreServices().stream().map(item -> "%s (%s stores)".formatted(item.serviceName(), PromptFormatterSupport.formatNumber(item.totalStoreCount()))).toList())
            .topOpenedAdministrationSummaries(districtDetail.store().topOpenedAdministrations().stream().map(item -> "%s (opened %s, opening %s)".formatted(item.administrationName(), PromptFormatterSupport.formatNumber(item.openedStoreCount()), PromptFormatterSupport.formatPercent(item.openingRate()))).toList())
            .topClosedAdministrationSummaries(districtDetail.store().topClosedAdministrations().stream().map(item -> "%s (closed %s, closure %s)".formatted(item.administrationName(), PromptFormatterSupport.formatNumber(item.closedStoreCount()), PromptFormatterSupport.formatPercent(item.closureRate()))).toList())
            .topSalesServiceSummaries(districtDetail.sales().topSalesServices().stream().map(item -> "%s (change %s)".formatted(item.serviceName(), PromptFormatterSupport.formatPercent(item.salesChangeRate()))).toList())
            .topSalesAdministrationSummaries(districtDetail.sales().topSalesAdministrations().stream().map(item -> "%s (sales %s, change %s)".formatted(item.administrationName(), PromptFormatterSupport.formatNumber(item.totalSalesAmount()), PromptFormatterSupport.formatPercent(item.salesChangeRate()))).toList())
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

    private String formatPeerStoreSummary(CommercialPeerStoreQueryResult peerStore) {
        return "%s (stores %s, opening %s, closure %s)".formatted(peerStore.serviceName(), PromptFormatterSupport.formatNumber(peerStore.totalStoreCount()), PromptFormatterSupport.formatPercent(peerStore.openingRate()), PromptFormatterSupport.formatPercent(peerStore.closureRate()));
    }

    private String formatAdministrationSalesService(AdministrationSalesServiceTopQueryResult item) {
        return "%s (sales %s, change %s)".formatted(item.serviceName(), PromptFormatterSupport.formatNumber(item.monthlySalesAmount()), PromptFormatterSupport.formatPercent(item.salesChangeRate()));
    }

    private String formatAdministrationStoreService(AdministrationStoreServiceTopQueryResult item) {
        return "%s (stores %s, opening %s, closure %s)".formatted(item.serviceName(), PromptFormatterSupport.formatNumber(item.totalStoreCount()), PromptFormatterSupport.formatPercent(item.openingRate()), PromptFormatterSupport.formatPercent(item.closureRate()));
    }
}
