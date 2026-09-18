package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseCategory;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseProvenance;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import java.util.List;
import java.util.StringJoiner;
import java.util.stream.Collectors;
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
        joiner.add(formatExpenseSection(sourceData));
        joiner.add(formatStoreSection(sourceData));
        joiner.add(formatSummaryComparisonSection(sourceData));
        return joiner.toString();
    }

    private String formatRegionSection(CommercialAiSourceData sourceData) {
        return """
            [지역]
            - 자치구: %s (%s)
            - 행정동: %s (%s)
            """.formatted(
            sourceData.districtName(),
            sourceData.districtCode(),
            sourceData.administrationName(),
            sourceData.administrationCode()
        );
    }

    private String formatFootTrafficSection(CommercialAiSourceData sourceData) {
        return """
            [유동인구]
            - 최대 시간대: %s
            - 최대 요일: %s
            - 최대 연령대: %s
            """.formatted(
            sourceData.peakFootTrafficTimeSlot(),
            sourceData.peakFootTrafficDayOfWeek(),
            sourceData.peakFootTrafficAgeGroup()
        );
    }

    private String formatSalesSection(CommercialAiSourceData sourceData) {
        return """
            [매출]
            - 최대 시간대: %s
            - 최대 요일: %s
            - 최대 연령대: %s
            - 비중이 가장 큰 성별/연령 조합: %s
            """.formatted(
            sourceData.peakSalesTimeSlot(),
            sourceData.peakSalesDayOfWeek(),
            sourceData.peakSalesAgeGroup(),
            sourceData.largestAgeGenderShare()
        );
    }

    private String formatFacilitySection(CommercialAiSourceData sourceData) {
        return """
            [시설]
            - 총 시설 수: %s
            - 학교 수: %s
            - 교통 시설 수: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.totalFacilityCount()),
            PromptFormatterSupport.formatNumber(sourceData.schoolCount()),
            PromptFormatterSupport.formatNumber(sourceData.transportationFacilityCount())
        );
    }

    private String formatPopulationSection(CommercialAiSourceData sourceData) {
        return """
            [거주인구]
            - 총 거주인구: %s
            - 비중이 가장 큰 연령대: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.totalResidentPopulationCount()),
            sourceData.largestResidentAgeGroup()
        );
    }

    /**
     * 원천이 상권 단위 월 평균 소득 제공을 중단해 소득 줄을 걷어내고 섹션 제목도 [지출] 로 좁힌다.
     * 지출 자체도 값이 없는 분기가 있어, 그때는 0 원 대신 결측 표기가 그대로 들어간다. (이슈 #413)
     *
     * <p>금액만 적으면 LLM 이 대체값을 이 상권의 실측으로 읽는다. 값이 상권 것인지 소속 행정동을 빌려온
     * 것인지를 출처 줄로 밝히고, 원천 서비스가 만든 면책 문장이 있으면 그대로 「유의」 줄에 싣는다.
     * 항목은 스코프마다 구성이 달라(상권 9개 / 행정동 대체 10개) 키를 고정하지 않고 배열을 순서대로 적으며,
     * 라벨도 서버가 준 문구를 그대로 쓴다. (이슈 #415)
     */
    private String formatExpenseSection(CommercialAiSourceData sourceData) {
        CommercialAiExpenseProvenance provenance = sourceData.expenseProvenance();
        StringJoiner lines = new StringJoiner("\n", "", "\n");
        lines.add("[지출]");
        lines.add("- 소비 출처: %s".formatted(formatProvenance(provenance)));
        lines.add("- 총 지출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.totalExpenseAmount())));
        lines.add("- 항목별 지출: %s".formatted(formatExpenseCategories(sourceData.expenseCategories())));
        lines.add("- 지출 비중이 가장 큰 항목: %s".formatted(sourceData.largestExpenseCategory()));
        addDisclaimerLine(lines, provenance);
        return lines.toString();
    }

    /** 항목 키를 아는 책임이 이 서비스에 없으므로 배열을 순서대로 적고 라벨은 서버가 준 것을 그대로 쓴다. */
    private String formatExpenseCategories(List<CommercialAiExpenseCategory> categories) {
        if (categories == null || categories.isEmpty()) {
            return PromptFormatterSupport.NOT_AVAILABLE;
        }
        return categories.stream()
            .map(category -> "%s: %s".formatted(
                PromptFormatterSupport.orNotAvailable(category.label()), PromptFormatterSupport.formatNumber(category.amount())
            ))
            .collect(Collectors.joining(", "));
    }

    /** 출처가 없는 것 자체가 정보다. 지어내지 않고 결측 표기를 그대로 둔다. */
    private String formatProvenance(CommercialAiExpenseProvenance provenance) {
        if (provenance == null) {
            return PromptFormatterSupport.NOT_AVAILABLE;
        }
        return "%s (값을 가져온 영역: %s, 기준 분기: %s, 원천: %s)".formatted(
            PromptFormatterSupport.orNotAvailable(provenance.scopeName()),
            PromptFormatterSupport.orNotAvailable(provenance.areaName()),
            PromptFormatterSupport.orNotAvailable(provenance.effectivePeriodCode()),
            PromptFormatterSupport.orNotAvailable(provenance.sourceLabel())
        );
    }

    /** 면책은 대체·중단일 때만 있다. 네이티브에서는 줄 자체를 만들지 않는다 — 없는 경고를 LLM 이 받아 적는다. */
    private void addDisclaimerLine(StringJoiner lines, CommercialAiExpenseProvenance provenance) {
        String disclaimer = provenance == null ? null : provenance.disclaimer();
        if (disclaimer != null && !disclaimer.isBlank()) {
            lines.add("- 유의: %s".formatted(disclaimer));
        }
    }

    private String formatStoreSection(CommercialAiSourceData sourceData) {
        return """
            [점포 분석]
            - 총 점포 수: %s
            - 유사 업종 점포 수: %s
            - 개업 점포 수 / 개업률: %s / %s
            - 폐업 점포 수 / 폐업률: %s / %s
            - 프랜차이즈 점포 수: %s
            - 비교 업종 예시: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.totalStoreCount()),
            PromptFormatterSupport.formatNumber(sourceData.similarStoreCount()),
            PromptFormatterSupport.formatNumber(sourceData.openedStoreCount()),
            PromptFormatterSupport.formatPercent(sourceData.openingRate()),
            PromptFormatterSupport.formatNumber(sourceData.closedStoreCount()),
            PromptFormatterSupport.formatPercent(sourceData.closureRate()),
            PromptFormatterSupport.formatNumber(sourceData.franchiseStoreCount()),
            PromptFormatterSupport.formatTopList(sourceData.peerStoreSummaries(), 3, item -> item)
        );
    }

    /**
     * 상권 총지출에만 출처를 붙인다. 자치구·행정동 leg 는 원천이 살아 있어 대체하지 않지만, 상권 leg 에는
     * 소속 행정동 총액이 들어올 수 있다. 그 사실을 빼면 LLM 이 행정동 값끼리 비교해 놓고 "상권이 행정동과
     * 같은 수준" 이라는 없는 결론을 만든다. (이슈 #415)
     */
    private String formatSummaryComparisonSection(CommercialAiSourceData sourceData) {
        CommercialAiExpenseProvenance provenance = sourceData.commercialExpenseProvenance();
        StringJoiner lines = new StringJoiner("\n", "", "\n");
        lines.add("[지역 비교]");
        lines.add("- 자치구 매출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.districtSalesAmount())));
        lines.add("- 행정동 매출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.administrationSalesAmount())));
        lines.add("- 상권 매출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.commercialSalesAmount())));
        lines.add("- 자치구 총지출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.districtExpenseAmount())));
        lines.add("- 행정동 총지출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.administrationExpenseAmount())));
        lines.add("- 상권 총지출: %s".formatted(PromptFormatterSupport.formatNumber(sourceData.commercialExpenseAmount())));
        lines.add("- 상권 총지출 출처: %s".formatted(formatProvenance(provenance)));
        addDisclaimerLine(lines, provenance);
        return lines.toString();
    }
}
