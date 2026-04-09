package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client.feign.CommercialRegionClient;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGenderPercentInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByAgeGroupInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesCountByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.ComparisonWinnerSide;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialComparisonQueryProcessor {

    private static final double ZERO_DIFF_RATE = 0D;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialRegionClient commercialRegionClient;

    public CommercialComparisonInfo compareCommercials(
        String periodCode,
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode
    ) {
        CommercialSalesInfo leftSales = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, leftCommercialCode, serviceCode);
        CommercialSalesInfo rightSales = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, rightCommercialCode, serviceCode);
        CommercialFootTrafficInfo leftFootTraffic = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, leftCommercialCode);
        CommercialFootTrafficInfo rightFootTraffic = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, rightCommercialCode);
        CommercialStoreAnalysisInfo leftStore = commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, leftCommercialCode, serviceCode);
        CommercialStoreAnalysisInfo rightStore = commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, rightCommercialCode, serviceCode);
        CommercialIncomeAndExpenseInfo leftIncome = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, leftCommercialCode);
        CommercialIncomeAndExpenseInfo rightIncome = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, rightCommercialCode);
        CommercialResidentPopulationInfo leftPopulation = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, leftCommercialCode);
        CommercialResidentPopulationInfo rightPopulation = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, rightCommercialCode);
        CommercialFacilityInfo leftFacility = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, leftCommercialCode);
        CommercialFacilityInfo rightFacility = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, rightCommercialCode);

        CommercialComparisonTargetInfo left = buildTargetInfo(leftCommercialCode, fetchAdministration(leftCommercialCode));
        CommercialComparisonTargetInfo right = buildTargetInfo(rightCommercialCode, fetchAdministration(rightCommercialCode));

        List<ComparisonMetricInfo> salesMetrics = List.of(
            toMetric("월 매출액", totalSalesAmount(leftSales.amountByDayOfWeekInfo()), totalSalesAmount(rightSales.amountByDayOfWeekInfo())),
            toMetric("매출 건수", totalSalesCount(leftSales.countByDayOfWeekInfo()), totalSalesCount(rightSales.countByDayOfWeekInfo())),
            toMetric("남성 매출 건수", leftSales.countByGenderInfo().maleSalesCount(), rightSales.countByGenderInfo().maleSalesCount()),
            toMetric("여성 매출 건수", leftSales.countByGenderInfo().femaleSalesCount(), rightSales.countByGenderInfo().femaleSalesCount())
        );
        List<ComparisonMetricInfo> footTrafficMetrics = List.of(
            toMetric("총 유동인구", totalFootTraffic(leftFootTraffic.byDayOfWeekInfo()), totalFootTraffic(rightFootTraffic.byDayOfWeekInfo())),
            toMetric("남성 유동인구 비중", maleFootTrafficShare(leftFootTraffic.byAgeGenderPercentInfo()), maleFootTrafficShare(rightFootTraffic.byAgeGenderPercentInfo())),
            toMetric("여성 유동인구 비중", femaleFootTrafficShare(leftFootTraffic.byAgeGenderPercentInfo()), femaleFootTrafficShare(rightFootTraffic.byAgeGenderPercentInfo()))
        );
        List<ComparisonMetricInfo> storeMetrics = List.of(
            toMetric("총 점포 수", leftStore.totalStoreCount(), rightStore.totalStoreCount()),
            toMetric("유사업종 점포 수", leftStore.similarStoreCount(), rightStore.similarStoreCount()),
            toMetric("개업률", leftStore.openingRate(), rightStore.openingRate()),
            toMetric("폐업률", leftStore.closureRate(), rightStore.closureRate(), true),
            toMetric("프랜차이즈 점포 수", leftStore.franchiseStoreCount(), rightStore.franchiseStoreCount())
        );
        List<ComparisonMetricInfo> spendingMetrics = List.of(
            toMetric("월 평균 소득", leftIncome.averageIncomeInfo().monthlyAverageIncomeAmount(), rightIncome.averageIncomeInfo().monthlyAverageIncomeAmount()),
            toMetric("총 지출액", totalExpenseAmount(leftIncome.expenseByCategoryInfo()), totalExpenseAmount(rightIncome.expenseByCategoryInfo()))
        );
        List<ComparisonMetricInfo> residentPopulationMetrics = List.of(
            toMetric("총 거주인구", leftPopulation.byAgeInfo().totalResidentPopulation(), rightPopulation.byAgeInfo().totalResidentPopulation()),
            toMetric("남성 거주인구 비중", leftPopulation.malePercentage(), rightPopulation.malePercentage()),
            toMetric("여성 거주인구 비중", leftPopulation.femalePercentage(), rightPopulation.femalePercentage())
        );
        List<ComparisonMetricInfo> facilityMetrics = List.of(
            toMetric("총 시설 수", leftFacility.totalFacilityCount(), rightFacility.totalFacilityCount()),
            toMetric("학교 수", leftFacility.schoolCountInfo().totalSchoolCount(), rightFacility.schoolCountInfo().totalSchoolCount()),
            toMetric("교통 시설 수", leftFacility.totalTransportationFacilityCount(), rightFacility.totalTransportationFacilityCount())
        );

        return CommercialComparisonInfo.builder()
            .left(left)
            .right(right)
            .salesMetrics(salesMetrics)
            .footTrafficMetrics(footTrafficMetrics)
            .storeMetrics(storeMetrics)
            .spendingMetrics(spendingMetrics)
            .residentPopulationMetrics(residentPopulationMetrics)
            .facilityMetrics(facilityMetrics)
            .salesTimeSlotMetrics(buildSalesTimeSlotMetrics(leftSales.amountByTimeSlotInfo(), rightSales.amountByTimeSlotInfo()))
            .salesAgeMetrics(buildSalesAgeMetrics(leftSales.amountByAgeInfo(), rightSales.amountByAgeInfo()))
            .footTrafficTimeSlotMetrics(buildFootTrafficTimeSlotMetrics(leftFootTraffic.byTimeSlotInfo(), rightFootTraffic.byTimeSlotInfo()))
            .footTrafficAgeMetrics(buildFootTrafficAgeMetrics(leftFootTraffic.byAgeGroupInfo(), rightFootTraffic.byAgeGroupInfo()))
            .highlights(buildHighlights(left, right, salesMetrics, storeMetrics, residentPopulationMetrics))
            .build();
    }

    private CommercialComparisonTargetInfo buildTargetInfo(String commercialCode, CommercialAdministrationQueryResult administration) {
        return CommercialComparisonTargetInfo.builder()
            .commercialCode(commercialCode)
            .commercialName(commercialCode)
            .districtCode(administration.districtCode())
            .districtName(administration.districtName())
            .administrationCode(administration.administrationCode())
            .administrationName(administration.administrationName())
            .build();
    }

    private CommercialAdministrationQueryResult fetchAdministration(String commercialCode) {
        Response<CommercialAdministrationQueryResult> response = commercialRegionClient.getCommercialAdministration(commercialCode);
        if (response == null || response.dataBody() == null) {
            throw new IllegalArgumentException("Commercial region metadata not found.");
        }
        return response.dataBody();
    }

    private List<ComparisonMetricInfo> buildSalesTimeSlotMetrics(CommercialSalesByTimeSlotInfo left, CommercialSalesByTimeSlotInfo right) {
        return List.of(
            toMetric("00-06", left.salesAmountTime00To06(), right.salesAmountTime00To06()),
            toMetric("06-11", left.salesAmountTime06To11(), right.salesAmountTime06To11()),
            toMetric("11-14", left.salesAmountTime11To14(), right.salesAmountTime11To14()),
            toMetric("14-17", left.salesAmountTime14To17(), right.salesAmountTime14To17()),
            toMetric("17-21", left.salesAmountTime17To21(), right.salesAmountTime17To21()),
            toMetric("21-24", left.salesAmountTime21To24(), right.salesAmountTime21To24())
        );
    }

    private List<ComparisonMetricInfo> buildSalesAgeMetrics(CommercialSalesByAgeInfo left, CommercialSalesByAgeInfo right) {
        return List.of(
            toMetric("10대 매출액", left.age10SalesAmount(), right.age10SalesAmount()),
            toMetric("20대 매출액", left.age20SalesAmount(), right.age20SalesAmount()),
            toMetric("30대 매출액", left.age30SalesAmount(), right.age30SalesAmount()),
            toMetric("40대 매출액", left.age40SalesAmount(), right.age40SalesAmount()),
            toMetric("50대 매출액", left.age50SalesAmount(), right.age50SalesAmount()),
            toMetric("60대 이상 매출액", left.age60PlusSalesAmount(), right.age60PlusSalesAmount())
        );
    }

    private List<ComparisonMetricInfo> buildFootTrafficTimeSlotMetrics(CommercialFootTrafficByTimeSlotInfo left, CommercialFootTrafficByTimeSlotInfo right) {
        return List.of(
            toMetric("00-06", left.footTrafficTime00To06(), right.footTrafficTime00To06()),
            toMetric("06-11", left.footTrafficTime06To11(), right.footTrafficTime06To11()),
            toMetric("11-14", left.footTrafficTime11To14(), right.footTrafficTime11To14()),
            toMetric("14-17", left.footTrafficTime14To17(), right.footTrafficTime14To17()),
            toMetric("17-21", left.footTrafficTime17To21(), right.footTrafficTime17To21()),
            toMetric("21-24", left.footTrafficTime21To24(), right.footTrafficTime21To24())
        );
    }

    private List<ComparisonMetricInfo> buildFootTrafficAgeMetrics(CommercialFootTrafficByAgeGroupInfo left, CommercialFootTrafficByAgeGroupInfo right) {
        return List.of(
            toMetric("10대 유동인구", left.age10FootTraffic(), right.age10FootTraffic()),
            toMetric("20대 유동인구", left.age20FootTraffic(), right.age20FootTraffic()),
            toMetric("30대 유동인구", left.age30FootTraffic(), right.age30FootTraffic()),
            toMetric("40대 유동인구", left.age40FootTraffic(), right.age40FootTraffic()),
            toMetric("50대 유동인구", left.age50FootTraffic(), right.age50FootTraffic()),
            toMetric("60대 이상 유동인구", left.age60PlusFootTraffic(), right.age60PlusFootTraffic())
        );
    }

    private List<String> buildHighlights(
        CommercialComparisonTargetInfo left,
        CommercialComparisonTargetInfo right,
        List<ComparisonMetricInfo> salesMetrics,
        List<ComparisonMetricInfo> storeMetrics,
        List<ComparisonMetricInfo> residentPopulationMetrics
    ) {
        ComparisonMetricInfo sales = salesMetrics.get(0);
        ComparisonMetricInfo closure = storeMetrics.get(3);
        ComparisonMetricInfo population = residentPopulationMetrics.get(0);

        return List.of(
            "%s이(가) 월 매출액에서 우세합니다.".formatted(winnerLabel(left, right, sales.winnerSide())),
            "%s이(가) 거주 수요 잠재력이 더 높습니다.".formatted(winnerLabel(left, right, population.winnerSide())),
            "%s이(가) 폐업률 측면에서 더 안정적입니다.".formatted(winnerLabel(left, right, closure.winnerSide()))
        );
    }

    private String winnerLabel(CommercialComparisonTargetInfo left, CommercialComparisonTargetInfo right, ComparisonWinnerSide winnerSide) {
        return switch (winnerSide) {
            case LEFT -> left.commercialName();
            case RIGHT -> right.commercialName();
            case TIE -> "두 상권";
        };
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

    private ComparisonMetricInfo toMetric(String label, double leftValue, double rightValue) {
        return toMetric(label, leftValue, rightValue, false);
    }

    private ComparisonMetricInfo toMetric(String label, double leftValue, double rightValue, boolean lowerIsBetter) {
        double diffValue = leftValue - rightValue;
        double diffRate = rightValue == 0D ? ZERO_DIFF_RATE : (diffValue / rightValue) * 100D;

        return ComparisonMetricInfo.builder()
            .label(label)
            .leftValue(leftValue)
            .rightValue(rightValue)
            .diffValue(diffValue)
            .diffRate(diffRate)
            .winnerSide(resolveWinner(leftValue, rightValue, lowerIsBetter))
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
}
