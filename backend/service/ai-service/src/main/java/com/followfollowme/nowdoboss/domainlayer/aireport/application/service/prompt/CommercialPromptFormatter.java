package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialPeerStoreQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesByAgeGenderPercentQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import java.util.StringJoiner;
import org.springframework.stereotype.Component;

@Component
public class CommercialPromptFormatter {

    public String format(CommercialAiSourceData sourceData) {
        StringJoiner joiner = new StringJoiner("\n\n");
        joiner.add(formatRegionSection(sourceData));
        joiner.add(formatFootTrafficSection(sourceData));
        joiner.add(formatSalesSection(sourceData));
        joiner.add(formatFacilitySection(sourceData));
        joiner.add(formatPopulationSection(sourceData));
        joiner.add(formatIncomeSection(sourceData));
        joiner.add(formatStoreSection(sourceData));
        joiner.add(formatSummaryComparisonSection(sourceData));
        return joiner.toString();
    }

    private String formatRegionSection(CommercialAiSourceData sourceData) {
        return """
            [상권 소속 지역]
            - 자치구: %s (%s)
            - 행정동: %s (%s)
            """.formatted(
            sourceData.administrationInfo().districtName(),
            sourceData.administrationInfo().districtCode(),
            sourceData.administrationInfo().administrationName(),
            sourceData.administrationInfo().administrationCode()
        );
    }

    private String formatFootTrafficSection(CommercialAiSourceData sourceData) {
        return """
            [유동인구]
            - 시간대 최대 유동: %s
            - 요일 최대 유동: %s
            - 연령대 최대 유동: %s
            """.formatted(
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "00~06시", sourceData.footTraffic().byTimeSlot().footTrafficTime00To06(),
                "06~11시", sourceData.footTraffic().byTimeSlot().footTrafficTime06To11(),
                "11~14시", sourceData.footTraffic().byTimeSlot().footTrafficTime11To14(),
                "14~17시", sourceData.footTraffic().byTimeSlot().footTrafficTime14To17(),
                "17~21시", sourceData.footTraffic().byTimeSlot().footTrafficTime17To21(),
                "21~24시", sourceData.footTraffic().byTimeSlot().footTrafficTime21To24()
            )),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "월요일", sourceData.footTraffic().byDayOfWeek().mondayFootTraffic(),
                "화요일", sourceData.footTraffic().byDayOfWeek().tuesdayFootTraffic(),
                "수요일", sourceData.footTraffic().byDayOfWeek().wednesdayFootTraffic(),
                "목요일", sourceData.footTraffic().byDayOfWeek().thursdayFootTraffic(),
                "금요일", sourceData.footTraffic().byDayOfWeek().fridayFootTraffic(),
                "토요일", sourceData.footTraffic().byDayOfWeek().saturdayFootTraffic(),
                "일요일", sourceData.footTraffic().byDayOfWeek().sundayFootTraffic()
            )),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", sourceData.footTraffic().byAgeGroup().age10FootTraffic(),
                "20대", sourceData.footTraffic().byAgeGroup().age20FootTraffic(),
                "30대", sourceData.footTraffic().byAgeGroup().age30FootTraffic(),
                "40대", sourceData.footTraffic().byAgeGroup().age40FootTraffic(),
                "50대", sourceData.footTraffic().byAgeGroup().age50FootTraffic(),
                "60대 이상", sourceData.footTraffic().byAgeGroup().age60PlusFootTraffic()
            ))
        );
    }

    private String formatSalesSection(CommercialAiSourceData sourceData) {
        CommercialSalesByAgeGenderPercentQueryResult percent = sourceData.sales().amountByAgeGenderPercent();
        return """
            [매출]
            - 시간대 최대 매출: %s
            - 요일 최대 매출: %s
            - 연령대 최대 매출: %s
            - 성별/연령 비중 최대: %s
            """.formatted(
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "00~06시", sourceData.sales().amountByTimeSlot().salesAmountTime00To06(),
                "06~11시", sourceData.sales().amountByTimeSlot().salesAmountTime06To11(),
                "11~14시", sourceData.sales().amountByTimeSlot().salesAmountTime11To14(),
                "14~17시", sourceData.sales().amountByTimeSlot().salesAmountTime14To17(),
                "17~21시", sourceData.sales().amountByTimeSlot().salesAmountTime17To21(),
                "21~24시", sourceData.sales().amountByTimeSlot().salesAmountTime21To24()
            )),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "월요일", sourceData.sales().amountByDayOfWeek().mondaySalesAmount(),
                "화요일", sourceData.sales().amountByDayOfWeek().tuesdaySalesAmount(),
                "수요일", sourceData.sales().amountByDayOfWeek().wednesdaySalesAmount(),
                "목요일", sourceData.sales().amountByDayOfWeek().thursdaySalesAmount(),
                "금요일", sourceData.sales().amountByDayOfWeek().fridaySalesAmount(),
                "토요일", sourceData.sales().amountByDayOfWeek().saturdaySalesAmount(),
                "일요일", sourceData.sales().amountByDayOfWeek().sundaySalesAmount()
            )),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", sourceData.sales().amountByAge().age10SalesAmount(),
                "20대", sourceData.sales().amountByAge().age20SalesAmount(),
                "30대", sourceData.sales().amountByAge().age30SalesAmount(),
                "40대", sourceData.sales().amountByAge().age40SalesAmount(),
                "50대", sourceData.sales().amountByAge().age50SalesAmount(),
                "60대 이상", sourceData.sales().amountByAge().age60PlusSalesAmount()
            )),
            PromptFormatterSupport.formatTopPercentEntry(PromptFormatterSupport.orderedPercentMap(
                "남성 10대", percent.maleAge10Percent(),
                "여성 10대", percent.femaleAge10Percent(),
                "남성 20대", percent.maleAge20Percent(),
                "여성 20대", percent.femaleAge20Percent(),
                "남성 30대", percent.maleAge30Percent(),
                "여성 30대", percent.femaleAge30Percent(),
                "남성 40대", percent.maleAge40Percent(),
                "여성 40대", percent.femaleAge40Percent(),
                "남성 50대", percent.maleAge50Percent(),
                "여성 50대", percent.femaleAge50Percent(),
                "남성 60대 이상", percent.maleAge60PlusPercent(),
                "여성 60대 이상", percent.femaleAge60PlusPercent()
            ))
        );
    }

    private String formatFacilitySection(CommercialAiSourceData sourceData) {
        return """
            [집객시설]
            - 총 시설 수: %s개
            - 학교 수: %s개
            - 교통시설 수: %s개
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.facility().totalFacilityCount()),
            PromptFormatterSupport.formatNumber(sourceData.facility().schoolCount().totalSchoolCount()),
            PromptFormatterSupport.formatNumber(sourceData.facility().totalTransportationFacilityCount())
        );
    }

    private String formatPopulationSection(CommercialAiSourceData sourceData) {
        return """
            [상주인구]
            - 총 상주인구: %s명
            - 최대 연령대: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.population().totalResidentPopulationCount()),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "10대", sourceData.population().byAge().age10ResidentPopulation(),
                "20대", sourceData.population().byAge().age20ResidentPopulation(),
                "30대", sourceData.population().byAge().age30ResidentPopulation(),
                "40대", sourceData.population().byAge().age40ResidentPopulation(),
                "50대", sourceData.population().byAge().age50ResidentPopulation(),
                "60대 이상", sourceData.population().byAge().age60PlusResidentPopulation()
            ))
        );
    }

    private String formatIncomeSection(CommercialAiSourceData sourceData) {
        return """
            [소득 및 지출]
            - 평균 소득: %s원
            - 소비 지출 최대 항목: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.income().averageIncome().monthlyAverageIncomeAmount()),
            PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
                "식료품", sourceData.income().expenseByCategory().groceryExpenseAmount(),
                "의류", sourceData.income().expenseByCategory().clothingExpenseAmount(),
                "의료", sourceData.income().expenseByCategory().medicalExpenseAmount(),
                "생활용품", sourceData.income().expenseByCategory().householdExpenseAmount(),
                "교통", sourceData.income().expenseByCategory().transportationExpenseAmount(),
                "여가", sourceData.income().expenseByCategory().leisureExpenseAmount(),
                "문화", sourceData.income().expenseByCategory().cultureExpenseAmount(),
                "교육", sourceData.income().expenseByCategory().educationExpenseAmount(),
                "유흥", sourceData.income().expenseByCategory().entertainmentExpenseAmount()
            ))
        );
    }

    private String formatStoreSection(CommercialAiSourceData sourceData) {
        return """
            [점포 분석]
            - 총 점포 수: %s개
            - 유사 업종 점포 수: %s개
            - 개업 수/개업률: %s개 / %s
            - 폐업 수/폐업률: %s개 / %s
            - 프랜차이즈 점포 수: %s개
            - 비교 업종 예시: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.store().totalStoreCount()),
            PromptFormatterSupport.formatNumber(sourceData.store().similarStoreCount()),
            PromptFormatterSupport.formatNumber(sourceData.store().openedStoreCount()),
            PromptFormatterSupport.formatPercent(sourceData.store().openingRate()),
            PromptFormatterSupport.formatNumber(sourceData.store().closedStoreCount()),
            PromptFormatterSupport.formatPercent(sourceData.store().closureRate()),
            PromptFormatterSupport.formatNumber(sourceData.store().franchiseStoreCount()),
            PromptFormatterSupport.formatTopList(sourceData.store().peerStores(), 3, this::formatPeerStore)
        );
    }

    private String formatSummaryComparisonSection(CommercialAiSourceData sourceData) {
        return """
            [지역 비교 요약]
            - 자치구 월매출: %s원
            - 행정동 월매출: %s원
            - 상권 월매출: %s원
            - 자치구 총지출: %s원
            - 행정동 총지출: %s원
            - 상권 총지출: %s원
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.salesSummary().district().monthlySalesAmount()),
            PromptFormatterSupport.formatNumber(sourceData.salesSummary().administration().monthlySalesAmount()),
            PromptFormatterSupport.formatNumber(sourceData.salesSummary().commercial().monthlySalesAmount()),
            PromptFormatterSupport.formatNumber(sourceData.incomeSummary().district().totalExpenseAmount()),
            PromptFormatterSupport.formatNumber(sourceData.incomeSummary().administration().totalExpenseAmount()),
            PromptFormatterSupport.formatNumber(sourceData.incomeSummary().commercial().totalExpenseAmount())
        );
    }

    private String formatPeerStore(CommercialPeerStoreQueryResult peerStore) {
        return "%s(점포 %s개, 개업률 %s, 폐업률 %s)".formatted(
            peerStore.serviceName(),
            PromptFormatterSupport.formatNumber(peerStore.totalStoreCount()),
            PromptFormatterSupport.formatPercent(peerStore.openingRate()),
            PromptFormatterSupport.formatPercent(peerStore.closureRate())
        );
    }
}
