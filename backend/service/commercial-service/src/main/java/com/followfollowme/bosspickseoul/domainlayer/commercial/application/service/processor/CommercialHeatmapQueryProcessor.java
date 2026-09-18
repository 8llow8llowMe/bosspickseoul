package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreCountsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapSource;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.MetricRange;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ChangeIndicatorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.shared.enums.GradeLevel;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialHeatmapQueryProcessor {

    private static final double NORMALIZED_DEFAULT_WHEN_RANGE_COLLAPSED = 50D;
    private static final double NORMALIZED_MIN = 0D;
    private static final double NORMALIZED_MAX = 100D;

    private static final double RISK_MULTIPLIER_OPPORTUNITY = 0.8D;
    private static final double RISK_MULTIPLIER_ENTRENCHED = 1.1D;
    private static final double RISK_MULTIPLIER_UNSTABLE = 1.2D;
    private static final double RISK_MULTIPLIER_DEFAULT = 1.0D;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final ChangeCommercialRepositoryPort changeCommercialRepositoryPort;

    /**
     * 단일 지표 히트맵 응답을 완성해서 돌려준다.
     *
     * <p>메타데이터와 요약 문구까지 여기서 만든다. 예전에는 점수 목록만 돌려주고 조립은 Facade 가
     * 했는데, 복합 지표 경로({@code CommercialCandidateQueryProcessor.getCompositeHeatmapScores})는
     * 같은 타입을 Processor 에서 완성해 돌려주고 있었다. 계층이 호출 경로에 따라 갈려 있어
     * 맞춘 것이다.
     *
     * <p>다만 조립 지점의 <b>개수</b>는 아직 하나가 아니다. 이 메서드와
     * {@code CommercialCandidateQueryProcessor} 의 두 곳, 합쳐서 세 곳이
     * {@code CommercialHeatmapScoresResponseInfo} 를 만든다. 모두 Processor 계층이라 경계는
     * 맞지만, 필드를 추가할 때는 여전히 세 곳을 함께 고쳐야 한다. 필드 집합을 한 곳에 고정하려면
     * Info 에 단일 지표용 · 복합용 정적 팩토리를 두는 별도 정리가 필요하다.
     */
    public CommercialHeatmapScoresResponseInfo getHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes, CommercialHeatmapMetricType metricType
    ) {
        List<CommercialHeatmapScoreInfo> scores = getAllMetricScores(periodCode, serviceCode, commercialCodes).stream()
            .map(entry -> entry.scoresByMetric().get(metricType))
            .filter(Objects::nonNull)
            .toList();

        return CommercialHeatmapScoresResponseInfo.builder()
            .mode(HeatmapModeType.SINGLE_METRIC.toMetadata())
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .metricType(metricType.toScoreMetadata())
            .summary("%s 기준으로 조회한 상권 히트맵 결과입니다.".formatted(metricType.getDisplayName()))
            .scores(scores)
            .build();
    }

    public List<CommercialAllMetricScoresInfo> getAllMetricScores(
        String periodCode, String serviceCode, List<String> commercialCodes
    ) {
        List<CommercialHeatmapSource> sources = loadSources(periodCode, serviceCode, commercialCodes);
        Map<CommercialHeatmapMetricType, MetricRange> rangeByMetric = computeRanges(sources);

        List<CommercialAllMetricScoresInfo> result = new ArrayList<>(sources.size());
        for (CommercialHeatmapSource source : sources) {
            result.add(buildAllMetricScores(source, rangeByMetric));
        }
        return result;
    }

    /**
     * 요청한 상권 전부의 원천 지표를 지표 종류당 조회 한 번씩으로 모은다.
     *
     * <p>예전에는 상권 코드를 루프로 돌며 상권마다 단건 조회 7회(매출 · 유동인구 · 점포 · 점포의
     * 동종업종 피어 · 상주인구 · 소득 · 집객시설)를 던졌다. {@code commercialCodes} 에 개수 상한이
     * 없으므로 지도 뷰포트가 넓으면 왕복이 그대로 곱해졌다. 지금은 상권 수와 무관하게 6회 고정이다
     * (변화지표 1 + 원천 5). 피어 조회는 히트맵이 그 결과를 쓰지 않으므로 아예 빠졌고, 소득소비도 점수식에서
     * 빠진 뒤 읽는 곳이 없어졌으므로 조회 자체를 없앴다. (이슈 #415)
     *
     * <p>「데이터 없음」의 전달 방식이 바뀌었다. 단건 경로는 {@code CommercialException} 을 던졌고
     * 여기서 잡아 제외했지만, 벌크는 맵에 키가 없는 것으로 알린다. 판정은
     * {@link #buildSource} 한 곳에 모았고, 결과(점수 산정에서 제외하되 요청 전체는 성공)는 같다.
     */
    private List<CommercialHeatmapSource> loadSources(
        String periodCode, String serviceCode, List<String> commercialCodes
    ) {
        if (commercialCodes.isEmpty()) {
            return List.of();
        }

        Map<String, ChangeCommercial> changeByCode = changeCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(ChangeCommercial::commercialCode, change -> change, (first, ignored) -> first));

        Map<String, CommercialSalesInfo> salesByCode = commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodesAndServiceCode(periodCode, commercialCodes, serviceCode);
        Map<String, CommercialFootTrafficInfo> footTrafficByCode = commercialQueryProcessor
            .getFootTrafficByPeriodCodeAndCommercialCodes(periodCode, commercialCodes);
        Map<String, CommercialStoreCountsInfo> storeByCode = commercialQueryProcessor
            .getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(periodCode, commercialCodes, serviceCode);
        Map<String, CommercialResidentPopulationInfo> populationByCode = commercialQueryProcessor
            .getPopulationByPeriodCodeAndCommercialCodes(periodCode, commercialCodes);
        Map<String, CommercialFacilityInfo> facilityByCode = commercialQueryProcessor
            .getFacilityByPeriodCodeAndCommercialCodes(periodCode, commercialCodes);

        return commercialCodes.stream()
            .map(code -> buildSource(
                code,
                salesByCode.get(code),
                footTrafficByCode.get(code),
                storeByCode.get(code),
                populationByCode.get(code),
                facilityByCode.get(code),
                changeByCode.get(code)
            ))
            .toList();
    }

    /**
     * 지표가 하나라도 없는 상권은 요청 전체를 실패시키지 않고 점수 산정 대상에서만 제외한다
     * (예: 해당 업종 매출이 없는 상권).
     *
     * <p>소득소비는 이 게이트에도, 원천 목록에도 없다. 소득 지표가 걷히고 지출이 null 허용이 된 뒤로
     * 소득소비 행 유무가 네 지표 중 어느 것도 좌우하지 않는데, 게이트에 남겨 두면 2024년 이후 소득소비 행이
     * 없는 560개 상권이 네 지표 전부 INSUFFICIENT 로 빠져 지도에서 사라진다. (이슈 #413)
     */
    private CommercialHeatmapSource buildSource(
        String commercialCode,
        CommercialSalesInfo sales,
        CommercialFootTrafficInfo footTraffic,
        CommercialStoreCountsInfo store,
        CommercialResidentPopulationInfo population,
        CommercialFacilityInfo facility,
        ChangeCommercial change
    ) {
        CommercialHeatmapSource source = new CommercialHeatmapSource(
            commercialCode,
            sales == null ? commercialCode : sales.commercialName(),
            sales,
            footTraffic,
            store,
            population,
            facility,
            change
        );
        // 필수 원천 목록은 CommercialHeatmapSource.hasAllMetrics() 하나만 들고 있다.
        // 여기에 같은 null 조건을 다시 쓰면 지표를 늘릴 때 두 곳이 갈린다.
        return source.hasAllMetrics() ? source : CommercialHeatmapSource.empty(commercialCode);
    }

    private Map<CommercialHeatmapMetricType, MetricRange> computeRanges(List<CommercialHeatmapSource> sources) {
        Map<CommercialHeatmapMetricType, MetricRange> ranges = new EnumMap<>(CommercialHeatmapMetricType.class);
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            List<Double> rawValues = sources.stream()
                .map(source -> computeRawScore(metric, source))
                .filter(Objects::nonNull)
                .toList();
            if (rawValues.isEmpty()) {
                ranges.put(metric, MetricRange.EMPTY);
                continue;
            }
            double min = rawValues.stream().min(Comparator.naturalOrder()).orElse(0D);
            double max = rawValues.stream().max(Comparator.naturalOrder()).orElse(0D);
            ranges.put(metric, new MetricRange(min, max));
        }
        return ranges;
    }

    private CommercialAllMetricScoresInfo buildAllMetricScores(
        CommercialHeatmapSource source, Map<CommercialHeatmapMetricType, MetricRange> rangeByMetric
    ) {
        Map<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> scoresByMetric =
            new EnumMap<>(CommercialHeatmapMetricType.class);

        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            Double normalized = normalize(computeRawScore(metric, source), rangeByMetric.get(metric));
            scoresByMetric.put(metric, CommercialHeatmapScoreInfo.builder()
                .commercialCode(source.commercialCode())
                .commercialName(source.commercialName())
                .metricType(metric.toScoreMetadata())
                .score(normalized)
                .grade(toGrade(normalized))
                .summaryLabel(buildSummaryLabel(metric, normalized))
                .build());
        }

        return CommercialAllMetricScoresInfo.builder()
            .commercialCode(source.commercialCode())
            .commercialName(source.commercialName())
            .scoresByMetric(scoresByMetric)
            .build();
    }

    private Double computeRawScore(CommercialHeatmapMetricType metricType, CommercialHeatmapSource source) {
        if (!source.hasAllMetrics()) {
            return null;
        }
        return switch (metricType) {
            case OPPORTUNITY_SCORE -> computeOpportunity(source);
            case RISK_SCORE -> computeRisk(source) * resolveRiskMultiplier(source.changeCommercial());
            case CONGESTION_SCORE -> computeCongestion(source);
            case RESIDENT_POPULATION_SCORE -> computeResidentPopulation(source);
        };
    }

    /**
     * 기회도에서 지출 항(0.20)을 걷어내고 남은 네 항의 가중치를 0.80 으로 나눠 재정규화했다
     * (0.35/0.20/0.15/0.10 → 0.4375/0.25/0.1875/0.125). (이슈 #413)
     *
     * <p>지출을 0 으로 채워 두면 <b>지출이 있는 상권과 없는 상권이 섞인 분기</b>에서 결측 상권만
     * 이 항에서 영구히 0 점을 받는다. 실측상 20234 는 1,650곳 중 1,089곳만 값이 있고 레거시 분기에도
     * 지출이 전부 0 인 상권이 35곳 있다. 게다가 그 0 이 {@code MetricRange.min} 을 끌어내려
     * 나머지 상권의 정규화 점수까지 위로 압축한다. 이 점수는 후보 추천
     * ({@code CommercialCandidateQueryProcessor})으로도 흘러간다.
     *
     * <p><b>되돌리지 않는다.</b> 이슈 #415 로 소비가 「복구」됐지만 그 값은 상권 원천이 아니라 소속 행정동의
     * 대체값이다. 같은 행정동에 속한 상권이 전부 같은 금액을 받으므로 상권 간 변별력이 0 이고, 점수에 넣으면
     * 행정동 단위로 뭉친 <b>가짜 차이</b>가 만들어진다. 서울 425개 행정동에 상권 1,650곳이 걸려 있어 평균
     * 네 곳이 같은 값을 공유한다. 이 점수는 후보 추천({@code CommercialCandidateQueryProcessor})으로도 흘러가므로
     * 추천 순위까지 행정동 단위로 계단이 진다. 상권 단위 지출 원천이 실제로 되살아나기 전에는 되돌리지 말 것.
     */
    private double computeOpportunity(CommercialHeatmapSource source) {
        return totalSalesAmount(source.sales().amountByDayOfWeekInfo()) * 0.4375
            + totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.25
            + source.store().openingRate() * 1000D * 0.1875
            + source.population().byAgeInfo().totalResidentPopulation() * 0.125;
    }

    private double computeRisk(CommercialHeatmapSource source) {
        return source.store().closureRate() * 1000D * 0.45
            + source.store().similarStoreCount() * 0.20
            + source.store().totalStoreCount() * 0.15
            + source.sales().amountByTimeSlotInfo().salesAmountTime00To06() * 0.10
            + source.sales().amountByTimeSlotInfo().salesAmountTime21To24() * 0.10;
    }

    private double computeCongestion(CommercialHeatmapSource source) {
        return totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.50
            + source.store().totalStoreCount() * 0.25
            + source.store().similarStoreCount() * 0.25;
    }

    /**
     * 원천이 상권 단위 월 평균 소득 제공을 중단해 소득 항(0.20)을 걷어내고 거주인구 계수를 1.00 으로 올린다.
     * 이것은 항등 변환이 아니라 <b>지표 정의 변경</b>이다. (이슈 #413)
     *
     * <p>20233 이하 레거시 분기에는 {@code monthly_average_income_amount} 에 실값이 있었으므로, 그 분기의
     * 「거주 수요」 히트맵은 순위·색·등급이 실제로 바뀐다. 프론트가 레거시 분기를 드롭다운에 열어 두므로
     * 그 경로는 실제로 호출된다. 20241 이후에는 소득이 전 상권 0 이었으므로 결과가 같다.
     *
     * <p>계수를 1.00 으로 올린 것은 점수 절대값을 위한 것이 아니다. {@code normalize} 가 요청 안 원시값의
     * min-max 정규화라 모든 값에 같은 양수를 곱하면 결과가 동일하고, 절대값은 응답에 드러나지 않는다.
     * 단일 항 지표의 계수를 1 이 아닌 값으로 남겨 두면 읽는 쪽이 없는 항을 찾게 되므로 정리한 것이다.
     */
    private double computeResidentPopulation(CommercialHeatmapSource source) {
        return source.population().byAgeInfo().totalResidentPopulation() * 1.00;
    }

    private double resolveRiskMultiplier(ChangeCommercial change) {
        if (change == null) {
            return RISK_MULTIPLIER_DEFAULT;
        }
        ChangeIndicatorCode indicator = ChangeIndicatorCode.fromCode(change.changeIndicatorCode());
        if (indicator == null) {
            return RISK_MULTIPLIER_DEFAULT;
        }
        return switch (indicator) {
            case LH -> RISK_MULTIPLIER_OPPORTUNITY;
            case HL -> RISK_MULTIPLIER_ENTRENCHED;
            case HH, LL -> RISK_MULTIPLIER_UNSTABLE;
        };
    }

    private double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount()
            + info.thursdaySalesAmount() + info.fridaySalesAmount() + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic()
            + info.thursdayFootTraffic() + info.fridayFootTraffic() + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private Double normalize(Double rawScore, MetricRange range) {
        if (rawScore == null || range == null) {
            return null;
        }
        if (range.isCollapsed()) {
            return NORMALIZED_DEFAULT_WHEN_RANGE_COLLAPSED;
        }
        double normalized = ((rawScore - range.min()) / (range.max() - range.min())) * NORMALIZED_MAX;
        return Math.max(NORMALIZED_MIN, Math.min(NORMALIZED_MAX, normalized));
    }

    private String toGrade(Double score) {
        return GradeLevel.fromScore(score).name();
    }

    /**
     * 지표 요약 라벨을 만든다.
     *
     * <p><b>불변식: 라벨은 어느 갈래에서도 지표명을 품는다.</b> 이 라벨은 지표명 없이 나열되는
     * 자리에도 쓰이기 때문이다 — 대표적으로 후보 추천 문장
     * ({@code CommercialCandidateQueryProcessor#buildSelectionReason}) 이 "기회도는 " 같은
     * 접두사를 붙이지 않고 라벨만 이어 붙인다. 데이터가 없는 갈래에서 지표명을 빼면
     * "데이터 부족 · 데이터 부족" 처럼 어느 지표가 없는지 알 수 없는 문장이 나간다.
     *
     * <p>등급 낱말은 셋 다 받침으로 끝나므로, 이 라벨 뒤에 조사를 붙이는 쪽은
     * {@code KoreanJosa} 를 쓴다.
     */
    static String buildSummaryLabel(CommercialHeatmapMetricType metricType, Double score) {
        GradeLevel grade = GradeLevel.fromScore(score);
        String stateWord = switch (grade) {
            case INSUFFICIENT -> "데이터 부족";
            case HIGH -> "높음";
            case MEDIUM -> "보통";
            case LOW -> "낮음";
        };
        return switch (metricType) {
            case OPPORTUNITY_SCORE -> "기회도 " + stateWord;
            case RISK_SCORE -> "위험도 " + stateWord;
            case CONGESTION_SCORE -> "혼잡도 " + stateWord;
            case RESIDENT_POPULATION_SCORE -> "거주 수요 " + stateWord;
        };
    }
}
