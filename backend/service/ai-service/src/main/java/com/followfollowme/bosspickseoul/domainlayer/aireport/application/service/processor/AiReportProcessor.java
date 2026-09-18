package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseCategory;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseProvenance;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationSalesServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationStoreServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseCategoryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseProvenanceQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialPeerStoreQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesByAgeGenderPercentQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.ComparisonMetricQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.RegionalIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt.PromptFormatterSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiComparisonRecommendedSide;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProperties;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AiReportProcessor {

    private final CommercialAnalysisQueryPort commercialAnalysisQueryPort;
    private final DistrictAnalysisQueryPort districtAnalysisQueryPort;
    private final AdministrationAnalysisQueryPort administrationAnalysisQueryPort;
    private final RegionAnalysisQueryPort regionAnalysisQueryPort;
    private final AiLlmPort aiLlmPort;
    private final AiReportCachePort aiReportCachePort;
    private final AiLlmProperties aiLlmProperties;
    private final Executor sourceFetchExecutor;

    /**
     * {@code @RequiredArgsConstructor} 대신 생성자를 직접 쓴다. Lombok 은 필드의 {@code @Qualifier} 를
     * 생성자 파라미터로 복사하지 않아(lombok.config 의 copyableAnnotations 미설정) 빈 이름으로 고를 수 없다.
     * Executor 빈이 여러 개(aiReportTaskExecutor / applicationTaskExecutor / aiSourceFetchTaskExecutor)라
     * 지정이 빠지면 엉뚱한 풀에 묶여 교착이 난다.
     */
    public AiReportProcessor(
        CommercialAnalysisQueryPort commercialAnalysisQueryPort, DistrictAnalysisQueryPort districtAnalysisQueryPort,
        AdministrationAnalysisQueryPort administrationAnalysisQueryPort, RegionAnalysisQueryPort regionAnalysisQueryPort,
        AiLlmPort aiLlmPort, AiReportCachePort aiReportCachePort, AiLlmProperties aiLlmProperties,
        @Qualifier("aiSourceFetchTaskExecutor") Executor sourceFetchExecutor
    ) {
        this.commercialAnalysisQueryPort = commercialAnalysisQueryPort;
        this.districtAnalysisQueryPort = districtAnalysisQueryPort;
        this.administrationAnalysisQueryPort = administrationAnalysisQueryPort;
        this.regionAnalysisQueryPort = regionAnalysisQueryPort;
        this.aiLlmPort = aiLlmPort;
        this.aiReportCachePort = aiReportCachePort;
        this.aiLlmProperties = aiLlmProperties;
        this.sourceFetchExecutor = sourceFetchExecutor;
    }

    public AiGenerationResult<CommercialAiReportSnapshot> generateCommercialReport(
        String commercialCode, String serviceCode, String periodCode
    ) {
        long startTime = System.currentTimeMillis();
        Optional<CommercialAiReportSnapshot> cached = aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            logReport("commercial", commercialCode, periodCode, true, startTime);
            return new AiGenerationResult<>(cached.get(), AiUsageMeta.empty(aiLlmProperties.model()));
        }

        // Stage 1: administrationInfo 먼저 조회 (districtCode/administrationCode가 stage 2에 필요)
        CommercialAdministrationQueryResult administrationInfo =
            regionAnalysisQueryPort.getCommercialAdministration(commercialCode);

        // Stage 2: 나머지 8개 병렬 호출.
        // executor 를 반드시 넘긴다. 생략하면 ForkJoinPool.commonPool() 로 가는데, parallelism 이 (코어수 - 1) 인
        // JVM 전역 공유 풀이라 블로킹 HTTP 로 채우면 무관한 병렬 작업까지 막히고 executor_* 메트릭에도 안 잡힌다.
        var ftFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialFootTraffic(commercialCode, periodCode), sourceFetchExecutor);
        var salesFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialSales(commercialCode, serviceCode, periodCode), sourceFetchExecutor);
        var facilityFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialFacility(commercialCode, periodCode), sourceFetchExecutor);
        var populationFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialPopulation(commercialCode, periodCode), sourceFetchExecutor);
        var incomeFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialIncome(commercialCode, periodCode), sourceFetchExecutor);
        var storeFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialStore(commercialCode, serviceCode, periodCode), sourceFetchExecutor);
        var salesSummaryFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialSalesSummary(
                administrationInfo.districtCode(), administrationInfo.administrationCode(),
                commercialCode, serviceCode, periodCode), sourceFetchExecutor);
        var incomeSummaryFuture = CompletableFuture.supplyAsync(
            () -> commercialAnalysisQueryPort.getCommercialIncomeSummary(
                administrationInfo.districtCode(), administrationInfo.administrationCode(),
                commercialCode, periodCode), sourceFetchExecutor);

        try {
            CompletableFuture.allOf(
                ftFuture, salesFuture, facilityFuture, populationFuture,
                incomeFuture, storeFuture, salesSummaryFuture, incomeSummaryFuture
            ).join();
        } catch (CompletionException exception) {
            // join()은 원인 예외를 CompletionException으로 감싸므로 도메인 예외를 복원한다.
            // 복원하지 않으면 워커의 catch (AiReportException)이 매칭되지 않아
            // 원천 데이터 실패(AI_001)가 작업 실패(AI_008)로 뭉개진다.
            if (exception.getCause() instanceof AiReportException domainException) {
                throw domainException;
            }
            throw exception;
        }

        var footTraffic = ftFuture.join();
        var sales = salesFuture.join();
        var facility = facilityFuture.join();
        var population = populationFuture.join();
        var income = incomeFuture.join();
        var store = storeFuture.join();
        var salesSummary = salesSummaryFuture.join();
        var incomeSummary = incomeSummaryFuture.join();
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

        AiGenerationResult<CommercialAiDraft> llmResult = aiLlmPort.generateCommercialReport(sourceData);
        CommercialAiDraft draft = llmResult.draft();
        CommercialAiReportSnapshot reportSnapshot = new CommercialAiReportSnapshot(
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
        aiReportCachePort.saveCommercialReport(commercialCode, serviceCode, periodCode, reportSnapshot);
        logReport("commercial", commercialCode, periodCode, false, startTime);
        return new AiGenerationResult<>(reportSnapshot, llmResult.usage());
    }

    public AiGenerationResult<CommercialComparisonAiReportSnapshot> generateCommercialComparisonReport(CommercialComparisonAiQuery query) {
        String leftCommercialCode = query.leftCommercialCode();
        String rightCommercialCode = query.rightCommercialCode();
        String serviceCode = query.serviceCode();
        String periodCode = query.periodCode();

        long startTime = System.currentTimeMillis();
        Optional<CommercialComparisonAiReportSnapshot> cached = aiReportCachePort.getCommercialComparisonReport(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
        if (cached.isPresent()) {
            logReport("commercial-comparison", "%s:%s".formatted(leftCommercialCode, rightCommercialCode), periodCode, true, startTime);
            return new AiGenerationResult<>(cached.get(), AiUsageMeta.empty(aiLlmProperties.model()));
        }

        CommercialComparisonQueryResult comparison = commercialAnalysisQueryPort.getCommercialComparison(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
        CommercialComparisonAiSourceData sourceData = buildCommercialComparisonSourceData(comparison, serviceCode, periodCode);
        AiGenerationResult<CommercialComparisonAiDraft> llmResult = aiLlmPort.generateCommercialComparisonReport(sourceData);
        CommercialComparisonAiDraft draft = llmResult.draft();
        CommercialComparisonAiReportSnapshot reportSnapshot = new CommercialComparisonAiReportSnapshot(
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
            reportSnapshot
        );
        logReport("commercial-comparison", "%s:%s".formatted(leftCommercialCode, rightCommercialCode), periodCode, false, startTime);
        return new AiGenerationResult<>(reportSnapshot, llmResult.usage());
    }

    public AiGenerationResult<DistrictAiReportSnapshot> generateDistrictReport(String districtCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<DistrictAiReportSnapshot> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            logReport("district", districtCode, periodCode, true, startTime);
            return new AiGenerationResult<>(cached.get(), AiUsageMeta.empty(aiLlmProperties.model()));
        }

        DistrictAiSourceData sourceData = buildDistrictSourceData(
            districtCode,
            regionAnalysisQueryPort.getDistrict(districtCode).districtName(),
            periodCode,
            districtAnalysisQueryPort.getDistrictDetail(districtCode, periodCode)
        );
        AiGenerationResult<DistrictAiDraft> llmResult = aiLlmPort.generateDistrictReport(sourceData);
        DistrictAiDraft draft = llmResult.draft();
        DistrictAiReportSnapshot reportSnapshot = new DistrictAiReportSnapshot(
            draft.summary(),
            draft.marketStatus(),
            draft.recommendedBusinessCategories(),
            draft.cautionBusinessCategories(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveDistrictReport(districtCode, periodCode, reportSnapshot);
        logReport("district", districtCode, periodCode, false, startTime);
        return new AiGenerationResult<>(reportSnapshot, llmResult.usage());
    }

    public AiGenerationResult<AdministrationAiReportSnapshot> generateAdministrationReport(String administrationCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<AdministrationAiReportSnapshot> cached = aiReportCachePort.getAdministrationReport(administrationCode, periodCode);
        if (cached.isPresent()) {
            logReport("administration", administrationCode, periodCode, true, startTime);
            return new AiGenerationResult<>(cached.get(), AiUsageMeta.empty(aiLlmProperties.model()));
        }

        AdministrationAiSourceData sourceData = buildAdministrationSourceData(
            administrationCode,
            periodCode,
            regionAnalysisQueryPort.getAdministrationDistrict(administrationCode),
            administrationAnalysisQueryPort.getAdministrationDetail(administrationCode, periodCode),
            regionAnalysisQueryPort.getCommercialsByAdministration(administrationCode)
        );
        AiGenerationResult<AdministrationAiDraft> llmResult = aiLlmPort.generateAdministrationReport(sourceData);
        AdministrationAiDraft draft = llmResult.draft();
        AdministrationAiReportSnapshot reportSnapshot = new AdministrationAiReportSnapshot(
            draft.summary(),
            draft.marketStatus(),
            draft.recommendedBusinessCategories(),
            draft.cautionBusinessCategories(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveAdministrationReport(administrationCode, periodCode, reportSnapshot);
        logReport("administration", administrationCode, periodCode, false, startTime);
        return new AiGenerationResult<>(reportSnapshot, llmResult.usage());
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

        String commercialCode, String serviceCode, String periodCode, CommercialAdministrationQueryResult administrationInfo,

        CommercialFootTrafficQueryResult footTraffic, CommercialSalesQueryResult sales, CommercialFacilityQueryResult facility,

        CommercialResidentPopulationQueryResult population, CommercialIncomeAndExpenseQueryResult income,

        CommercialStoreAnalysisQueryResult store, CommercialSalesSummaryQueryResult salesSummary,

        CommercialIncomeSummaryQueryResult incomeSummary
    ) {
        CommercialSalesByAgeGenderPercentQueryResult salesPercent = sales.amountByAgeGenderPercent();

        return CommercialAiSourceData.builder()
            .commercialCode(commercialCode)
            .commercialName(administrationInfo.commercialName())
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
            .largestExpenseCategory(formatLargestExpenseCategory(income))
            .expenseCategories(toExpenseCategories(income))
            .totalExpenseAmount(income == null ? null : income.totalExpenseAmount())
            .expenseProvenance(toExpenseProvenance(income == null ? null : income.provenance()))
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
            .districtExpenseAmount(totalExpenseAmountOrNull(incomeSummary == null ? null : incomeSummary.district()))
            .administrationExpenseAmount(totalExpenseAmountOrNull(incomeSummary == null ? null : incomeSummary.administration()))
            .commercialExpenseAmount(totalExpenseAmountOrNull(incomeSummary == null ? null : incomeSummary.commercial()))
            .commercialExpenseProvenance(toExpenseProvenance(incomeSummary == null ? null : incomeSummary.commercialProvenance()))
            .build();
    }

    /**
     * 원천이 값을 주지 않는 분기에는 항목 배열이 통째로 null 로 내려온다. 0 원을 실측치처럼 프롬프트에
     * 써 넣지 않도록 포매터의 결측 표기를 그대로 쓴다. (이슈 #413)
     *
     * <p>항목 키를 여기서 나열하지 않는다. 구성이 스코프마다 달라(상권 9개 / 행정동 대체 10개) 고정 목록으로
     * 집계하면 대체 스코프에만 있는 항목이 최댓값 후보에서 빠진다. 라벨도 원천 서비스가 준 것을 그대로 쓴다.
     * (이슈 #415)
     */
    private String formatLargestExpenseCategory(CommercialIncomeAndExpenseQueryResult income) {
        List<CommercialExpenseCategoryQueryResult> categories = income == null ? null : income.expenseCategories();
        if (categories == null || categories.isEmpty()) {
            return PromptFormatterSupport.NOT_AVAILABLE;
        }
        Map<String, Long> amountByLabel = new LinkedHashMap<>();
        categories.forEach(category -> amountByLabel.put(category.label(), category.amount()));
        return PromptFormatterSupport.formatTopEntry(amountByLabel);
    }

    /** 항목 순서가 곧 원천이 정한 표기 순서다. 이 서비스가 재정렬하지 않는다. (이슈 #415) */
    private List<CommercialAiExpenseCategory> toExpenseCategories(CommercialIncomeAndExpenseQueryResult income) {
        List<CommercialExpenseCategoryQueryResult> categories = income == null ? null : income.expenseCategories();
        if (categories == null) {
            return null;
        }
        return categories.stream()
            .map(category -> new CommercialAiExpenseCategory(category.label(), category.amount()))
            .toList();
    }

    /**
     * 출처는 값이 없을 때도 내려오지만, 소득소비 404 를 결측으로 흡수한 분기에는 응답 자체가 없어 null 이다.
     * 그때 출처를 지어내지 않고 null 을 그대로 올려 프롬프트가 결측 표기를 쓰게 한다. (이슈 #415)
     */
    private CommercialAiExpenseProvenance toExpenseProvenance(CommercialExpenseProvenanceQueryResult provenance) {
        if (provenance == null) {
            return null;
        }
        return new CommercialAiExpenseProvenance(
            provenance.scope() == null ? null : provenance.scope().name(),
            provenance.scopeName(),
            provenance.effectivePeriodCode(),
            provenance.sourceLabel(),
            provenance.disclaimer()
        );
    }

    /**
     * 요약은 해당 분기에 그 지역 단위 지출 행이 없으면 단위별로 null 이 내려온다.
     * 단위 하나가 비어도 나머지 비교는 살려야 하므로 0 으로 채우지 않고 null 을 그대로 올린다. (이슈 #413)
     */
    private Long totalExpenseAmountOrNull(RegionalIncomeSummaryQueryResult regional) {
        return regional == null ? null : regional.totalExpenseAmount();
    }

    private CommercialComparisonAiSourceData buildCommercialComparisonSourceData(

        CommercialComparisonQueryResult comparison, String serviceCode, String periodCode
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
            .recommendedSide(normalizeComparisonRecommendedSide(comparison))
            .recommendedReasons(defaultList(comparison.recommendedReasons(), "추천 이유 데이터가 충분하지 않습니다."))
            .cautionPoints(defaultList(
                comparison.cautionPoints(), "두 상권의 경쟁 강도와 폐업률을 함께 확인하는 것이 좋습니다."
            ))
            .dominantTimeSlots(defaultList(comparison.dominantTimeSlots(), "시간대 비교 데이터가 충분하지 않습니다."))
            .dominantAgeGroups(defaultList(comparison.dominantAgeGroups(), "연령대 비교 데이터가 충분하지 않습니다."))
            .businessFitSummary(comparison.businessFitSummary())
            .comparisonHighlights(defaultList(
                comparison.comparisonHighlights(), "비교 하이라이트 데이터가 충분하지 않습니다."
            ))
            .salesMetricSummaries(toMetricSummaries(comparison.salesMetrics()))
            .footTrafficMetricSummaries(toMetricSummaries(comparison.footTrafficMetrics()))
            .storeMetricSummaries(toMetricSummaries(comparison.storeMetrics()))
            .spendingMetricSummaries(toSpendingMetricSummaries(comparison.spendingMetrics()))
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

    /**
     * 원천 비교 결과의 코드값을 AI 리포트 계약값(LEFT/RIGHT/BALANCED)으로 옮긴다.
     * 알 수 없는 코드는 그대로 흘려보낸다 — 상대 서비스가 값을 늘렸을 때 리포트 생성 자체가 막히는 것보다는
     * 프롬프트에 원문을 싣고 LLM 응답 검증에서 걸리게 하는 편이 낫다.
     */
    private String normalizeComparisonRecommendedSide(CommercialComparisonQueryResult comparison) {
        if (comparison.recommendedSide() == null || comparison.recommendedSide().code() == null) {
            return null;
        }
        String upstreamCode = comparison.recommendedSide().code();
        return AiComparisonRecommendedSide.fromUpstreamCode(upstreamCode)
            .map(Enum::name)
            .orElse(upstreamCode);
    }

    private DistrictAiSourceData buildDistrictSourceData(

        String districtCode, String districtName, String periodCode, DistrictDetailQueryResult districtDetail
    ) {
        return DistrictAiSourceData.builder()
            .districtCode(districtCode)
            .districtName(districtName)
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
                .map(item -> "%s (증감률 %s)".formatted(
                    item.serviceName(), PromptFormatterSupport.formatPercent(item.salesChangeRate())
                ))
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

        String administrationCode, String periodCode, AdministrationDistrictQueryResult districtInfo,

        AdministrationDetailQueryResult detail, List<AdministrationCommercialQueryResult> commercials
    ) {
        return AdministrationAiSourceData.builder()
            .administrationCode(administrationCode)
            .periodCode(periodCode)
            .districtCode(districtInfo.districtCode())
            .districtName(districtInfo.districtName())
            .administrationName(districtInfo.administrationName())
            .commercialCount(commercials.size())
            .commercialSummaries(commercials.stream()
                .map(item -> "%s (%s)".formatted(item.commercialName(), item.commercialCode()))
                .toList())
            .topSalesServiceSummaries(detail.sales().topSalesServices().stream().map(this::formatAdministrationSalesService).toList())
            .topStoreServiceSummaries(detail.store().topStoreServices().stream().map(this::formatAdministrationStoreService).toList())
            .totalExpenseAmount(detail.income().totalExpenseAmount())
            .build();
    }

    /**
     * 소비 비교 지표는 양쪽이 모두 0 이면 실측치가 아니라 결측이다. (이슈 #413)
     *
     * <p>peer 의 비교 응답은 FE 계약상 {@code spendingMetrics} 를 primitive {@code double} 로 내려주므로
     * 결측이 {@code 0} 과 구별되지 않는다. 그 0 을 그대로 프롬프트에 실으면 LLM 이 "양 상권 모두 소비가
     * 없다" 는 문장을 실측 근거처럼 만들어 낸다. 계약은 그대로 두고 여기서만 결측으로 표기한다.
     *
     * <p>소비가 행정동 원천으로 복구되면(이슈 #415) 값이 0 이 아니게 되므로 이 갈래는 저절로 꺼진다.
     */
    static List<String> toSpendingMetricSummaries(List<ComparisonMetricQueryResult> metrics) {
        if (metrics != null && !metrics.isEmpty() && metrics.stream().allMatch(AiReportProcessor::isZeroOnBothSides)) {
            return List.of("원천 미제공 — 서울 열린데이터광장이 상권 단위 소비 제공을 중단해 이 분기 값은 측정치가 아니다. 판단 근거로 쓰지 말 것.");
        }
        return toMetricSummaries(metrics);
    }

    private static boolean isZeroOnBothSides(ComparisonMetricQueryResult metric) {
        return metric.leftValue() == 0D && metric.rightValue() == 0D;
    }

    private static List<String> toMetricSummaries(List<ComparisonMetricQueryResult> metrics) {
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

    private static String formatMetricValue(double value) {
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
