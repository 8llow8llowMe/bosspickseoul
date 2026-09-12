package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonGuideInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricGroupGuideInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGenderPercentInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGroupInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByAgeGenderPercentInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesCountByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.ComparisonWinnerSide;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialComparisonQueryProcessor {

    private static final double ZERO_DIFF_RATE = 0D;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    public CommercialComparisonInfo compareCommercials(CommercialComparisonQuery query) {
        String periodCode = query.periodCode();
        String leftCommercialCode = query.leftCommercialCode();
        String rightCommercialCode = query.rightCommercialCode();
        String serviceCode = query.serviceCode();

        CommercialSalesInfo leftSales = commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, leftCommercialCode, serviceCode);
        CommercialSalesInfo rightSales = commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, rightCommercialCode, serviceCode);
        CommercialFootTrafficInfo leftFootTraffic = commercialQueryProcessor
            .getFootTrafficByPeriodCodeAndCommercialCode(periodCode, leftCommercialCode);
        CommercialFootTrafficInfo rightFootTraffic = commercialQueryProcessor
            .getFootTrafficByPeriodCodeAndCommercialCode(periodCode, rightCommercialCode);
        CommercialStoreAnalysisInfo leftStore = commercialQueryProcessor
            .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, leftCommercialCode, serviceCode);
        CommercialStoreAnalysisInfo rightStore = commercialQueryProcessor
            .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, rightCommercialCode, serviceCode);
        CommercialIncomeAndExpenseInfo leftIncome = commercialQueryProcessor
            .getIncomeByPeriodCodeAndCommercialCode(periodCode, leftCommercialCode);
        CommercialIncomeAndExpenseInfo rightIncome = commercialQueryProcessor
            .getIncomeByPeriodCodeAndCommercialCode(periodCode, rightCommercialCode);
        CommercialResidentPopulationInfo leftPopulation = commercialQueryProcessor
            .getPopulationByPeriodAndCommercialCode(periodCode, leftCommercialCode);
        CommercialResidentPopulationInfo rightPopulation = commercialQueryProcessor
            .getPopulationByPeriodAndCommercialCode(periodCode, rightCommercialCode);
        CommercialFacilityInfo leftFacility = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, leftCommercialCode);
        CommercialFacilityInfo rightFacility = commercialQueryProcessor
            .getFacilityByPeriodAndCommercialCode(periodCode, rightCommercialCode);

        CommercialComparisonTargetInfo left = buildTargetInfo(
            leftCommercialCode, leftSales.commercialName(), fetchAdministration(leftCommercialCode));
        CommercialComparisonTargetInfo right = buildTargetInfo(
            rightCommercialCode, rightSales.commercialName(), fetchAdministration(rightCommercialCode));

        List<ComparisonMetricInfo> salesMetrics = List.of(
            toMetric("총 매출액",
                totalSalesAmount(leftSales.amountByDayOfWeekInfo()), totalSalesAmount(rightSales.amountByDayOfWeekInfo()),
                MetricDisplayType.WON, "선택 분기의 요일별 매출액을 합산한 값입니다."),
            toMetric("매출 건수",
                totalSalesCount(leftSales.countByDayOfWeekInfo()), totalSalesCount(rightSales.countByDayOfWeekInfo()),
                MetricDisplayType.COUNT, "선택 분기의 요일별 매출 건수를 합산한 값입니다."),
            toMetric("남성 매출 건수",
                leftSales.countByGenderInfo().maleSalesCount(), rightSales.countByGenderInfo().maleSalesCount(),
                MetricDisplayType.COUNT, "선택 분기의 남성 고객 매출 건수입니다."),
            toMetric("여성 매출 건수",
                leftSales.countByGenderInfo().femaleSalesCount(), rightSales.countByGenderInfo().femaleSalesCount(),
                MetricDisplayType.COUNT, "선택 분기의 여성 고객 매출 건수입니다.")
        );
        List<ComparisonMetricInfo> footTrafficMetrics = List.of(
            toMetric("총 유동인구",
                totalFootTraffic(leftFootTraffic.byDayOfWeekInfo()), totalFootTraffic(rightFootTraffic.byDayOfWeekInfo()),
                MetricDisplayType.PERSON, "선택 분기의 요일별 추정 유동인구를 합산한 값입니다."),
            toMetric("남성 유동인구 비중",
                maleFootTrafficShare(leftFootTraffic.byAgeGenderPercentInfo()),
                maleFootTrafficShare(rightFootTraffic.byAgeGenderPercentInfo()), MetricDisplayType.PERCENTAGE,
                "선택 분기 유동인구의 남성 연령대별 비중을 합산한 값입니다."),
            toMetric("여성 유동인구 비중",
                femaleFootTrafficShare(leftFootTraffic.byAgeGenderPercentInfo()),
                femaleFootTrafficShare(rightFootTraffic.byAgeGenderPercentInfo()), MetricDisplayType.PERCENTAGE,
                "선택 분기 유동인구의 여성 연령대별 비중을 합산한 값입니다.")
        );
        List<ComparisonMetricInfo> storeMetrics = List.of(
            toMetric("총 점포 수", leftStore.totalStoreCount(), rightStore.totalStoreCount(), MetricDisplayType.ITEM,
                "선택 분기 상권 내 선택 업종의 총 점포 수입니다."),
            toMetric("유사 업종 점포 수", leftStore.similarStoreCount(), rightStore.similarStoreCount(), MetricDisplayType.ITEM,
                "선택 분기 선택 업종 조회 데이터의 유사 업종 점포 수입니다."),
            toMetric("개업률", leftStore.openingRate(), rightStore.openingRate(), MetricDisplayType.PERCENTAGE,
                "선택 분기 선택 업종의 개업률입니다."),
            toMetric("폐업률", leftStore.closureRate(), rightStore.closureRate(), MetricDisplayType.PERCENTAGE,
                "선택 분기 선택 업종의 폐업률이며 낮은 값이 우세합니다.", true),
            toMetric("프랜차이즈 점포 수", leftStore.franchiseStoreCount(), rightStore.franchiseStoreCount(), MetricDisplayType.ITEM,
                "선택 분기 상권 내 선택 업종의 프랜차이즈 점포 수입니다.")
        );
        List<ComparisonMetricInfo> spendingMetrics = List.of(
            toMetric("월 평균 소득",
                leftIncome.averageIncomeInfo().monthlyAverageIncomeAmount(),
                rightIncome.averageIncomeInfo().monthlyAverageIncomeAmount(), MetricDisplayType.WON,
                "선택 분기 상권의 추정 월 평균 소득 금액입니다."),
            toMetric("총 지출액",
                totalExpenseAmount(leftIncome.expenseByCategoryInfo()), totalExpenseAmount(rightIncome.expenseByCategoryInfo()),
                MetricDisplayType.WON, "선택 분기 상권의 소비 지출 항목별 금액을 합산한 값입니다.")
        );
        List<ComparisonMetricInfo> residentPopulationMetrics = List.of(
            toMetric("총 거주인구",
                leftPopulation.byAgeInfo().totalResidentPopulation(), rightPopulation.byAgeInfo().totalResidentPopulation(),
                MetricDisplayType.PERSON, "선택 분기 상권의 추정 거주인구입니다."),
            toMetric("남성 거주인구 비중", leftPopulation.malePercentage(), rightPopulation.malePercentage(),
                MetricDisplayType.PERCENTAGE, "선택 분기 거주인구 중 남성 비중입니다."),
            toMetric("여성 거주인구 비중", leftPopulation.femalePercentage(), rightPopulation.femalePercentage(),
                MetricDisplayType.PERCENTAGE, "선택 분기 거주인구 중 여성 비중입니다.")
        );
        List<ComparisonMetricInfo> facilityMetrics = List.of(
            toMetric("총 시설 수", leftFacility.totalFacilityCount(), rightFacility.totalFacilityCount(), MetricDisplayType.ITEM,
                "선택 분기 상권 내 집계 대상 시설의 총 개수입니다."),
            toMetric("학교 수", leftFacility.schoolCountInfo().totalSchoolCount(), rightFacility.schoolCountInfo().totalSchoolCount(),
                MetricDisplayType.ITEM, "선택 분기 상권 내 학교 시설 수입니다."),
            toMetric("교통 시설 수", leftFacility.totalTransportationFacilityCount(), rightFacility.totalTransportationFacilityCount(),
                MetricDisplayType.ITEM, "선택 분기 상권 내 버스 정류장과 지하철역 등 교통 시설 수입니다.")
        );

        List<ComparisonMetricInfo> decisionMetrics = buildDecisionMetrics(
            salesMetrics, storeMetrics, spendingMetrics, residentPopulationMetrics, facilityMetrics);
        ComparisonWinnerSide recommendedSide = resolveRecommendedSide(decisionMetrics);
        List<String> comparisonHighlights = buildHighlights(left, right, salesMetrics, storeMetrics, residentPopulationMetrics);

        return CommercialComparisonInfo.builder()
            .left(left)
            .right(right)
            .periodCode(periodCode)
            .serviceCode(serviceCode)
            .comparisonGuide(buildComparisonGuide())
            .comparisonSummary(buildComparisonSummary(left, right, recommendedSide))
            .recommendedSide(recommendedSide.toMetadata())
            .recommendedReasons(buildRecommendedReasons(left, right, recommendedSide, decisionMetrics))
            .cautionPoints(buildCautionPoints(left, right, recommendedSide))
            .dominantTimeSlots(buildDominantTimeSlots(left, right, leftSales.amountByTimeSlotInfo(), rightSales.amountByTimeSlotInfo()))
            .dominantAgeGroups(buildDominantAgeGroups(left, right, leftSales.amountByAgeInfo(), rightSales.amountByAgeInfo()))
            .businessFitSummary(buildBusinessFitSummary(left, right, recommendedSide))
            .salesMetrics(salesMetrics)
            .footTrafficMetrics(footTrafficMetrics)
            .storeMetrics(storeMetrics)
            .spendingMetrics(spendingMetrics)
            .residentPopulationMetrics(residentPopulationMetrics)
            .facilityMetrics(facilityMetrics)
            .salesTimeSlotMetrics(buildSalesTimeSlotMetrics(leftSales.amountByTimeSlotInfo(), rightSales.amountByTimeSlotInfo()))
            .salesAgeMetrics(buildSalesAgeMetrics(leftSales.amountByAgeInfo(), rightSales.amountByAgeInfo()))
            .salesAgeGenderMetrics(buildSalesAgeGenderMetrics(
                leftSales.amountByAgeGenderPercentInfo(), rightSales.amountByAgeGenderPercentInfo()))
            .footTrafficTimeSlotMetrics(buildFootTrafficTimeSlotMetrics(
                leftFootTraffic.byTimeSlotInfo(), rightFootTraffic.byTimeSlotInfo()))
            .footTrafficAgeMetrics(buildFootTrafficAgeMetrics(leftFootTraffic.byAgeGroupInfo(), rightFootTraffic.byAgeGroupInfo()))
            .footTrafficAgeGenderMetrics(buildFootTrafficAgeGenderMetrics(
                leftFootTraffic.byAgeGenderPercentInfo(), rightFootTraffic.byAgeGenderPercentInfo()))
            .comparisonHighlights(comparisonHighlights)
            .highlights(comparisonHighlights)
            .build();
    }

    private CommercialComparisonTargetInfo buildTargetInfo(

        String commercialCode, String commercialName, CommercialAdministrationQueryResult administration
    ) {
        return CommercialComparisonTargetInfo.builder()
            .commercialCode(commercialCode)
            .commercialName(commercialName)
            .districtCode(administration.districtCode())
            .districtName(administration.districtName())
            .administrationCode(administration.administrationCode())
            .administrationName(administration.administrationName())
            .build();
    }

    private CommercialAdministrationQueryResult fetchAdministration(String commercialCode) {
        return commercialRegionQueryPort.getCommercialAdministration(commercialCode);
    }

    private ComparisonGuideInfo buildComparisonGuide() {
        return ComparisonGuideInfo.builder()
            .periodBasis("모든 지표는 선택한 분기의 데이터를 기준으로 합니다.")
            .serviceBasis("매출·점포 지표는 선택 업종 기준이며, 유동인구·소득·거주인구·시설은 상권 전체 기준입니다.")
            .differenceBasis("차이는 왼쪽 상권 값에서 오른쪽 상권 값을 뺀 값입니다. 비율 차이는 %p로 표시합니다.")
            .diffRateBasis("차이율은 오른쪽 상권 값을 기준으로 계산합니다. 오른쪽 값이 0이면 차이율을 계산할 수 없습니다.")
            .recommendationDisclaimer("추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과이며 수익이나 창업 성과를 보장하지 않습니다. 원천 데이터에서 제공하지 않는 값도 0일 수 있습니다.")
            .metricGroups(List.of(
                groupGuide("salesMetrics", "매출", "선택 업종의 매출액과 매출 건수를 비교합니다."),
                groupGuide("footTrafficMetrics", "유동인구", "상권 전체의 추정 유동인구와 성별 비중을 비교합니다."),
                groupGuide("storeMetrics", "점포", "선택 업종 조회 데이터의 점포 수와 개·폐업 지표를 비교합니다."),
                groupGuide("spendingMetrics", "소비력", "상권 전체의 추정 월 평균 소득과 소비 지출을 비교합니다."),
                groupGuide("residentPopulationMetrics", "거주인구", "상권 전체의 추정 거주인구와 성별 비중을 비교합니다."),
                groupGuide("facilityMetrics", "시설", "상권 내 집계 대상 생활·교육·교통 시설을 비교합니다."),
                groupGuide("salesTimeSlotMetrics", "매출 시간대", "선택 업종의 시간대별 매출액을 비교합니다."),
                groupGuide("salesAgeMetrics", "매출 연령대", "선택 업종의 연령대별 매출액을 비교합니다."),
                groupGuide("salesAgeGenderMetrics", "매출 연령·성별", "선택 업종 매출의 연령·성별 비중을 비교합니다."),
                groupGuide("footTrafficTimeSlotMetrics", "유동인구 시간대", "상권 전체의 시간대별 추정 유동인구를 비교합니다."),
                groupGuide("footTrafficAgeMetrics", "유동인구 연령대", "상권 전체의 연령대별 추정 유동인구를 비교합니다."),
                groupGuide("footTrafficAgeGenderMetrics", "유동인구 연령·성별", "상권 전체 유동인구의 연령·성별 비중을 비교합니다.")
            ))
            .build();
    }

    private ComparisonMetricGroupGuideInfo groupGuide(String code, String name, String description) {
        return ComparisonMetricGroupGuideInfo.builder().code(code).name(name).description(description).build();
    }

    private String buildComparisonSummary(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide recommendedSide
    ) {
        return switch (recommendedSide) {
            case LEFT -> "%s이(가) 현재 업종 기준으로 더 유리한 상권입니다.".formatted(left.commercialName());
            case RIGHT -> "%s이(가) 현재 업종 기준으로 더 유리한 상권입니다.".formatted(right.commercialName());
            case TIE -> "%s과(와) %s은(는) 전반적인 경쟁력이 비슷한 상권입니다."
                .formatted(left.commercialName(), right.commercialName());
        };
    }

    private List<ComparisonMetricInfo> buildDecisionMetrics(

        List<ComparisonMetricInfo> salesMetrics, List<ComparisonMetricInfo> storeMetrics,

        List<ComparisonMetricInfo> spendingMetrics, List<ComparisonMetricInfo> residentPopulationMetrics,

        List<ComparisonMetricInfo> facilityMetrics
    ) {
        return List.of(
            salesMetrics.get(0),
            storeMetrics.get(2),
            storeMetrics.get(3),
            spendingMetrics.get(0),
            residentPopulationMetrics.get(0),
            facilityMetrics.get(0)
        );
    }

    private ComparisonWinnerSide resolveRecommendedSide(List<ComparisonMetricInfo> decisionMetrics) {
        int leftScore = 0;
        int rightScore = 0;

        for (ComparisonMetricInfo metric : decisionMetrics) {
            if (ComparisonWinnerSide.LEFT.name().equals(metric.winnerSide().code())) {
                leftScore++;
            } else if (ComparisonWinnerSide.RIGHT.name().equals(metric.winnerSide().code())) {
                rightScore++;
            }
        }

        if (leftScore == rightScore) {
            return ComparisonWinnerSide.TIE;
        }
        return leftScore > rightScore ? ComparisonWinnerSide.LEFT : ComparisonWinnerSide.RIGHT;
    }

    static List<String> buildRecommendedReasons(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide recommendedSide,
        List<ComparisonMetricInfo> decisionMetrics
    ) {
        if (recommendedSide == ComparisonWinnerSide.TIE) {
            return List.of(
                "두 상권은 핵심 비교 지표의 우위 개수가 같습니다.",
                "두 상권의 매출·개업률·폐업률·소득·거주인구·시설 지표를 함께 확인해야 합니다."
            );
        }

        String winner = winnerLabel(left, right, recommendedSide);
        String opponent = recommendedSide == ComparisonWinnerSide.LEFT ? right.commercialName() : left.commercialName();
        return decisionMetrics.stream()
            .filter(metric -> recommendedSide.name().equals(metric.winnerSide().code()))
            .limit(3)
            .map(metric -> {
                double winnerValue = recommendedSide == ComparisonWinnerSide.LEFT ? metric.leftValue() : metric.rightValue();
                double opponentValue = recommendedSide == ComparisonWinnerSide.LEFT ? metric.rightValue() : metric.leftValue();
                return "%s이(가) %s 지표에서 %s보다 우세합니다(%s: %s, %s: %s)."
                    .formatted(winner, metric.label(), opponent, winner, formatMetricValue(winnerValue, metric),
                        opponent, formatMetricValue(opponentValue, metric));
            })
            .toList();
    }

    private static String formatMetricValue(double value, ComparisonMetricInfo metric) {
        int precision = Math.max(metric.displayPrecision(), 0);
        return String.format(Locale.KOREA, "%,." + precision + "f%s", value, metric.unit());
    }

    private List<String> buildCautionPoints(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide recommendedSide
    ) {
        String selected = winnerLabel(left, right, recommendedSide);
        String opponent = recommendedSide == ComparisonWinnerSide.LEFT ? right.commercialName() : left.commercialName();
        if (recommendedSide == ComparisonWinnerSide.TIE) {
            return List.of(
                "두 상권 모두 비슷한 수준이므로 임대료와 경쟁 강도를 추가 비교하는 것이 좋습니다.",
                "단순 매출보다 운영 시간대와 목표 고객층 적합도를 함께 확인해야 합니다."
            );
        }
        return List.of(
            "%s 선택 시 유사 업종 점포 수와 차별화 전략을 함께 검토해야 합니다.".formatted(selected),
            "%s은(는) 비교 대상이지만 일부 지표에서 경쟁 우위를 보일 수 있어 추가 검토가 필요합니다."
                .formatted(opponent)
        );
    }

    private List<String> buildDominantTimeSlots(
        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right,
        CommercialSalesByTimeSlotInfo leftInfo, CommercialSalesByTimeSlotInfo rightInfo
    ) {
        return List.of(
            "%s 강세 시간대: %s".formatted(left.commercialName(), dominantSalesTimeSlot(leftInfo)),
            "%s 강세 시간대: %s".formatted(right.commercialName(), dominantSalesTimeSlot(rightInfo))
        );
    }

    private List<String> buildDominantAgeGroups(
        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right,
        CommercialSalesByAgeInfo leftInfo, CommercialSalesByAgeInfo rightInfo
    ) {
        return List.of(
            "%s 핵심 연령대: %s".formatted(left.commercialName(), dominantSalesAge(leftInfo)),
            "%s 핵심 연령대: %s".formatted(right.commercialName(), dominantSalesAge(rightInfo))
        );
    }

    private String buildBusinessFitSummary(
        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide recommendedSide
    ) {
        String template = "%s은(는) 현재 업종의 핵심 비교 지표 다수에서 상대 상권보다 우세합니다.";
        return switch (recommendedSide) {
            case LEFT -> template.formatted(left.commercialName());
            case RIGHT -> template.formatted(right.commercialName());
            case TIE -> "두 상권 모두 비슷한 적합도를 보여 예산과 운영 전략 기준의 추가 비교가 필요합니다.";
        };
    }

    private List<ComparisonMetricInfo> buildSalesTimeSlotMetrics(CommercialSalesByTimeSlotInfo left, CommercialSalesByTimeSlotInfo right) {
        return List.of(
            toMetric("00-06", left.salesAmountTime00To06(), right.salesAmountTime00To06(), MetricDisplayType.WON, salesTimeSlotDescription()),
            toMetric("06-11", left.salesAmountTime06To11(), right.salesAmountTime06To11(), MetricDisplayType.WON, salesTimeSlotDescription()),
            toMetric("11-14", left.salesAmountTime11To14(), right.salesAmountTime11To14(), MetricDisplayType.WON, salesTimeSlotDescription()),
            toMetric("14-17", left.salesAmountTime14To17(), right.salesAmountTime14To17(), MetricDisplayType.WON, salesTimeSlotDescription()),
            toMetric("17-21", left.salesAmountTime17To21(), right.salesAmountTime17To21(), MetricDisplayType.WON, salesTimeSlotDescription()),
            toMetric("21-24", left.salesAmountTime21To24(), right.salesAmountTime21To24(), MetricDisplayType.WON, salesTimeSlotDescription())
        );
    }

    private String salesTimeSlotDescription() {
        return "선택 분기 선택 업종의 해당 시간대 매출액입니다.";
    }

    private List<ComparisonMetricInfo> buildSalesAgeMetrics(CommercialSalesByAgeInfo left, CommercialSalesByAgeInfo right) {
        return List.of(
            toMetric("10대 매출액", left.age10SalesAmount(), right.age10SalesAmount(), MetricDisplayType.WON, salesAgeDescription()),
            toMetric("20대 매출액", left.age20SalesAmount(), right.age20SalesAmount(), MetricDisplayType.WON, salesAgeDescription()),
            toMetric("30대 매출액", left.age30SalesAmount(), right.age30SalesAmount(), MetricDisplayType.WON, salesAgeDescription()),
            toMetric("40대 매출액", left.age40SalesAmount(), right.age40SalesAmount(), MetricDisplayType.WON, salesAgeDescription()),
            toMetric("50대 매출액", left.age50SalesAmount(), right.age50SalesAmount(), MetricDisplayType.WON, salesAgeDescription()),
            toMetric("60대 이상 매출액", left.age60PlusSalesAmount(), right.age60PlusSalesAmount(), MetricDisplayType.WON, salesAgeDescription())
        );
    }

    private String salesAgeDescription() {
        return "선택 분기 선택 업종의 해당 연령대 매출액입니다.";
    }

    private List<ComparisonMetricInfo> buildSalesAgeGenderMetrics(
        CommercialSalesByAgeGenderPercentInfo left,
        CommercialSalesByAgeGenderPercentInfo right
    ) {
        return List.of(
            toMetric("남성 10대 매출 비중", left.maleAge10Percent(), right.maleAge10Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 10대 매출 비중", left.femaleAge10Percent(), right.femaleAge10Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("남성 20대 매출 비중", left.maleAge20Percent(), right.maleAge20Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 20대 매출 비중", left.femaleAge20Percent(), right.femaleAge20Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("남성 30대 매출 비중", left.maleAge30Percent(), right.maleAge30Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 30대 매출 비중", left.femaleAge30Percent(), right.femaleAge30Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("남성 40대 매출 비중", left.maleAge40Percent(), right.maleAge40Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 40대 매출 비중", left.femaleAge40Percent(), right.femaleAge40Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("남성 50대 매출 비중", left.maleAge50Percent(), right.maleAge50Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 50대 매출 비중", left.femaleAge50Percent(), right.femaleAge50Percent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("남성 60대 이상 매출 비중", left.maleAge60PlusPercent(), right.maleAge60PlusPercent(), MetricDisplayType.PERCENTAGE, salesShareDescription()),
            toMetric("여성 60대 이상 매출 비중", left.femaleAge60PlusPercent(), right.femaleAge60PlusPercent(), MetricDisplayType.PERCENTAGE, salesShareDescription())
        );
    }

    private String salesShareDescription() {
        return "선택 분기 선택 업종 매출에서 해당 연령·성별이 차지하는 비중입니다.";
    }

    private List<ComparisonMetricInfo> buildFootTrafficTimeSlotMetrics(
        CommercialFootTrafficByTimeSlotInfo left, CommercialFootTrafficByTimeSlotInfo right
    ) {
        return List.of(
            toMetric("00-06", left.footTrafficTime00To06(), right.footTrafficTime00To06(), MetricDisplayType.PERSON, footTrafficTimeDescription()),
            toMetric("06-11", left.footTrafficTime06To11(), right.footTrafficTime06To11(), MetricDisplayType.PERSON, footTrafficTimeDescription()),
            toMetric("11-14", left.footTrafficTime11To14(), right.footTrafficTime11To14(), MetricDisplayType.PERSON, footTrafficTimeDescription()),
            toMetric("14-17", left.footTrafficTime14To17(), right.footTrafficTime14To17(), MetricDisplayType.PERSON, footTrafficTimeDescription()),
            toMetric("17-21", left.footTrafficTime17To21(), right.footTrafficTime17To21(), MetricDisplayType.PERSON, footTrafficTimeDescription()),
            toMetric("21-24", left.footTrafficTime21To24(), right.footTrafficTime21To24(), MetricDisplayType.PERSON, footTrafficTimeDescription())
        );
    }

    private String footTrafficTimeDescription() {
        return "선택 분기 상권 전체의 해당 시간대 추정 유동인구입니다.";
    }

    private List<ComparisonMetricInfo> buildFootTrafficAgeMetrics(
        CommercialFootTrafficByAgeGroupInfo left, CommercialFootTrafficByAgeGroupInfo right
    ) {
        return List.of(
            toMetric("10대 유동인구", left.age10FootTraffic(), right.age10FootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription()),
            toMetric("20대 유동인구", left.age20FootTraffic(), right.age20FootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription()),
            toMetric("30대 유동인구", left.age30FootTraffic(), right.age30FootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription()),
            toMetric("40대 유동인구", left.age40FootTraffic(), right.age40FootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription()),
            toMetric("50대 유동인구", left.age50FootTraffic(), right.age50FootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription()),
            toMetric("60대 이상 유동인구", left.age60PlusFootTraffic(), right.age60PlusFootTraffic(), MetricDisplayType.PERSON, footTrafficAgeDescription())
        );
    }

    private String footTrafficAgeDescription() {
        return "선택 분기 상권 전체의 해당 연령대 추정 유동인구입니다.";
    }

    private List<ComparisonMetricInfo> buildFootTrafficAgeGenderMetrics(
        CommercialFootTrafficByAgeGenderPercentInfo left,
        CommercialFootTrafficByAgeGenderPercentInfo right
    ) {
        return List.of(
            toMetric("남성 10대 유동인구 비중", left.maleAge10Percent(), right.maleAge10Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 10대 유동인구 비중", left.femaleAge10Percent(), right.femaleAge10Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("남성 20대 유동인구 비중", left.maleAge20Percent(), right.maleAge20Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 20대 유동인구 비중", left.femaleAge20Percent(), right.femaleAge20Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("남성 30대 유동인구 비중", left.maleAge30Percent(), right.maleAge30Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 30대 유동인구 비중", left.femaleAge30Percent(), right.femaleAge30Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("남성 40대 유동인구 비중", left.maleAge40Percent(), right.maleAge40Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 40대 유동인구 비중", left.femaleAge40Percent(), right.femaleAge40Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("남성 50대 유동인구 비중", left.maleAge50Percent(), right.maleAge50Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 50대 유동인구 비중", left.femaleAge50Percent(), right.femaleAge50Percent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("남성 60대 이상 유동인구 비중", left.maleAge60PlusPercent(), right.maleAge60PlusPercent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription()),
            toMetric("여성 60대 이상 유동인구 비중", left.femaleAge60PlusPercent(), right.femaleAge60PlusPercent(), MetricDisplayType.PERCENTAGE, footTrafficShareDescription())
        );
    }

    private String footTrafficShareDescription() {
        return "선택 분기 상권 전체 유동인구에서 해당 연령·성별이 차지하는 비중입니다.";
    }

    private List<String> buildHighlights(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, List<ComparisonMetricInfo> salesMetrics,

        List<ComparisonMetricInfo> storeMetrics, List<ComparisonMetricInfo> residentPopulationMetrics
    ) {
        ComparisonMetricInfo sales = salesMetrics.get(0);
        ComparisonMetricInfo closure = storeMetrics.get(3);
        ComparisonMetricInfo population = residentPopulationMetrics.get(0);

        return List.of(
            buildHighlight(left, right, sales, "총 매출", "더 우세합니다"),
            buildHighlight(left, right, population, "총 거주인구", "더 많습니다"),
            buildHighlight(left, right, closure, "폐업률", "더 안정적입니다")
        );
    }

    private String buildHighlight(
        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonMetricInfo metric,
        String label, String advantage
    ) {
        ComparisonWinnerSide side = ComparisonWinnerSide.fromCode(metric.winnerSide().code());
        if (side == ComparisonWinnerSide.TIE) {
            return "두 상권의 %s 지표가 같습니다.".formatted(label);
        }
        return "%s이(가) %s 측면에서 %s.".formatted(winnerLabel(left, right, side), label, advantage);
    }

    private static String winnerLabel(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide winnerSide
    ) {
        return switch (winnerSide) {
            case LEFT -> left.commercialName();
            case RIGHT -> right.commercialName();
            case TIE -> "두 상권";
        };
    }

    private String winnerLabel(

        CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right,

        com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata winnerSide
    ) {
        ComparisonWinnerSide side = ComparisonWinnerSide.fromCode(winnerSide.code());
        return switch (side) {
            case LEFT -> left.commercialName();
            case RIGHT -> right.commercialName();
            case TIE -> "두 상권";
        };
    }

    private String dominantSalesTimeSlot(CommercialSalesByTimeSlotInfo info) {
        return List.of(
                new SlotValue("00-06", info.salesAmountTime00To06()),
                new SlotValue("06-11", info.salesAmountTime06To11()),
                new SlotValue("11-14", info.salesAmountTime11To14()),
                new SlotValue("14-17", info.salesAmountTime14To17()),
                new SlotValue("17-21", info.salesAmountTime17To21()),
                new SlotValue("21-24", info.salesAmountTime21To24())
            ).stream()
            .max((left, right) -> Double.compare(left.value(), right.value()))
            .map(SlotValue::label)
            .orElse("데이터 없음");
    }

    private String dominantSalesAge(CommercialSalesByAgeInfo info) {
        return List.of(
                new SlotValue("10대", info.age10SalesAmount()),
                new SlotValue("20대", info.age20SalesAmount()),
                new SlotValue("30대", info.age30SalesAmount()),
                new SlotValue("40대", info.age40SalesAmount()),
                new SlotValue("50대", info.age50SalesAmount()),
                new SlotValue("60대 이상", info.age60PlusSalesAmount())
            ).stream()
            .max((left, right) -> Double.compare(left.value(), right.value()))
            .map(SlotValue::label)
            .orElse("데이터 없음");
    }

    private double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount() + info.thursdaySalesAmount()
            + info.fridaySalesAmount() + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private double totalSalesCount(CommercialSalesCountByDayOfWeekInfo info) {
        return info.mondaySalesCount() + info.tuesdaySalesCount() + info.wednesdaySalesCount() + info.thursdaySalesCount()
            + info.fridaySalesCount() + info.saturdaySalesCount() + info.sundaySalesCount();
    }

    private double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic() + info.thursdayFootTraffic()
            + info.fridayFootTraffic() + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private double totalExpenseAmount(CommercialExpenseByCategoryInfo info) {
        return info.groceryExpenseAmount() + info.clothingExpenseAmount() + info.medicalExpenseAmount()
            + info.householdExpenseAmount() + info.transportationExpenseAmount() + info.leisureExpenseAmount()
            + info.cultureExpenseAmount() + info.educationExpenseAmount() + info.entertainmentExpenseAmount();
    }

    private double maleFootTrafficShare(CommercialFootTrafficByAgeGenderPercentInfo info) {
        return info.maleAge10Percent() + info.maleAge20Percent() + info.maleAge30Percent()
            + info.maleAge40Percent() + info.maleAge50Percent() + info.maleAge60PlusPercent();
    }

    private double femaleFootTrafficShare(CommercialFootTrafficByAgeGenderPercentInfo info) {
        return info.femaleAge10Percent() + info.femaleAge20Percent() + info.femaleAge30Percent()
            + info.femaleAge40Percent() + info.femaleAge50Percent() + info.femaleAge60PlusPercent();
    }

    private ComparisonMetricInfo toMetric(
        String label, double leftValue, double rightValue, MetricDisplayType displayType, String description
    ) {
        return toMetric(label, leftValue, rightValue, displayType, description, false);
    }

    private ComparisonMetricInfo toMetric(
        String label, double leftValue, double rightValue, MetricDisplayType displayType, String description, boolean lowerIsBetter
    ) {
        double diffValue = leftValue - rightValue;
        double diffRate = rightValue == 0D ? ZERO_DIFF_RATE : (diffValue / rightValue) * 100D;

        return ComparisonMetricInfo.builder()
            .label(label)
            .leftValue(leftValue)
            .rightValue(rightValue)
            .diffValue(diffValue)
            .diffRate(diffRate)
            .unit(displayType.unit())
            .displayPrecision(displayType.displayPrecision())
            .differenceUnit(displayType.differenceUnit())
            .description(description)
            .winnerSide(resolveWinner(leftValue, rightValue, lowerIsBetter).toMetadata())
            .build();
    }

    private ComparisonWinnerSide resolveWinner(double leftValue, double rightValue, boolean lowerIsBetter) {
        if (Double.compare(leftValue, rightValue) == 0) {
            return ComparisonWinnerSide.TIE;
        }
        if (lowerIsBetter) {
            return leftValue < rightValue ? ComparisonWinnerSide.LEFT : ComparisonWinnerSide.RIGHT;
        }
        return leftValue > rightValue ? ComparisonWinnerSide.LEFT : ComparisonWinnerSide.RIGHT;
    }

    private record SlotValue(String label, double value) {
    }

    private enum MetricDisplayType {
        WON("원", 0, "원"),
        PERSON("명", 0, "명"),
        COUNT("건", 0, "건"),
        ITEM("개", 0, "개"),
        PERCENTAGE("%", 1, "%p");

        private final String unit;
        private final int displayPrecision;
        private final String differenceUnit;

        MetricDisplayType(String unit, int displayPrecision, String differenceUnit) {
            this.unit = unit;
            this.displayPrecision = displayPrecision;
            this.differenceUnit = differenceUnit;
        }

        String unit() {
            return unit;
        }

        int displayPrecision() {
            return displayPrecision;
        }

        String differenceUnit() {
            return differenceUnit;
        }
    }
}
