package com.followfollowme.bosspickseoul.domainlayer.simulation.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.simulation.application.command.SimulationReportCommand;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationException;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationAgeSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationConditionInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationCostDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationGenderAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationKeyMoneyInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationSeasonInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationSimilarFranchiseeInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.DistrictSalesQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationRentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.query.DistrictServiceSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationFranchisee;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationRent;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationServiceType;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 창업 비용 시뮬레이션 계산.
 * 임대료 기준: 자치구별 3.3㎡당 월환산임대료(원). 프랜차이즈 비용 기준: 정보공개서(천원).
 * 내부 계산은 원 단위로 하고, 응답 시점에 만원으로 변환한다.
 */
@Service
@RequiredArgsConstructor
public class SimulationReportProcessor {

    private static final double SQUARE_METERS_PER_PYEONG_UNIT = 3.3D;
    private static final int DEPOSIT_MONTHS_OF_RENT = 10;
    private static final long THOUSAND = 1_000L;
    private static final long TEN_THOUSAND = 10_000L;
    private static final int SIMILAR_FRANCHISEE_COUNT = 5;
    private static final int TOP_AGE_GROUP_COUNT = 3;
    private static final int SEASON_MINIMUM_QUARTERS = 2;
    private static final Map<Character, List<Integer>> MONTHS_BY_QUARTER = Map.of(
        '1', List.of(1, 2, 3),
        '2', List.of(4, 5, 6),
        '3', List.of(7, 8, 9),
        '4', List.of(10, 11, 12)
    );

    private final SimulationServiceTypeRepositoryPort simulationServiceTypeRepositoryPort;
    private final SimulationRentRepositoryPort simulationRentRepositoryPort;
    private final SimulationFranchiseeRepositoryPort simulationFranchiseeRepositoryPort;
    private final DistrictSalesQueryPort districtSalesQueryPort;

    public SimulationReportInfo simulate(SimulationReportCommand command) {
        SimulationServiceType serviceType = simulationServiceTypeRepositoryPort.findByServiceCode(command.serviceCode())
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.SERVICE_TYPE_NOT_FOUND));
        SimulationRent rent = simulationRentRepositoryPort.findByDistrictCode(command.districtCode())
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.RENT_NOT_FOUND));
        SimulationFranchisee selectedFranchisee = resolveSelectedFranchisee(command);
        List<SimulationFranchisee> sameServiceFranchisees =
            simulationFranchiseeRepositoryPort.findAllByServiceCode(command.serviceCode());

        int pyeongUnitCount = (int) (command.storeSize() / SQUARE_METERS_PER_PYEONG_UNIT);
        long rentPriceWon = (long) pyeongUnitCount * resolveMonthlyRentPerUnit(rent, command.floorType());
        long depositWon = rentPriceWon * DEPOSIT_MONTHS_OF_RENT;
        Long levyWon = selectedFranchisee == null ? null : selectedFranchisee.totalLevy() * THOUSAND;
        long interiorWon = selectedFranchisee != null
            ? selectedFranchisee.interior() * THOUSAND
            : estimateInteriorWon(pyeongUnitCount, sameServiceFranchisees);
        long totalWon = rentPriceWon + depositWon + interiorWon + (levyWon == null ? 0L : levyWon);

        return SimulationReportInfo.builder()
            .condition(buildCondition(command, serviceType, rent, selectedFranchisee))
            .dataBaseYear(serviceType.baseYear())
            .totalPrice(totalWon / TEN_THOUSAND)
            .keyMoney(SimulationKeyMoneyInfo.builder()
                .keyMoneyRatio(serviceType.keyMoneyRatio())
                .keyMoneyAverage(serviceType.keyMoneyAverage())
                .keyMoneyLevel(serviceType.keyMoneyLevel())
                .build())
            .costDetail(SimulationCostDetailInfo.builder()
                .rentPrice(rentPriceWon / TEN_THOUSAND)
                .deposit(depositWon / TEN_THOUSAND)
                .interior(interiorWon / TEN_THOUSAND)
                .levy(levyWon == null ? null : levyWon / TEN_THOUSAND)
                .build())
            .similarFranchisees(findSimilarFranchisees(sameServiceFranchisees, rentPriceWon, depositWon, totalWon))
            .genderAgeAnalysis(buildGenderAgeAnalysis(command))
            .seasonAnalysis(buildSeasonAnalysis(command))
            .build();
    }

    private SimulationFranchisee resolveSelectedFranchisee(SimulationReportCommand command) {
        if (!command.franchisee()) {
            return null;
        }
        if (command.franchiseeId() == null) {
            throw new SimulationException(SimulationErrorCode.FRANCHISEE_REQUIRED);
        }
        SimulationFranchisee franchisee = simulationFranchiseeRepositoryPort.findById(command.franchiseeId())
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.FRANCHISEE_NOT_FOUND));
        if (!command.serviceCode().equals(franchisee.serviceCode())) {
            throw new SimulationException(SimulationErrorCode.FRANCHISEE_SERVICE_MISMATCH);
        }
        return franchisee;
    }

    private int resolveMonthlyRentPerUnit(SimulationRent rent, SimulationFloorType floorType) {
        return floorType == SimulationFloorType.FIRST_FLOOR ? rent.firstFloorRent() : rent.otherFloorRent();
    }

    /**
     * 비프랜차이즈 인테리어 추정: 같은 업종 프랜차이즈들의 3.3㎡당 인테리어 비용(천원) 평균 × 면적 단위 수.
     */
    private long estimateInteriorWon(int pyeongUnitCount, List<SimulationFranchisee> sameServiceFranchisees) {
        double averageUnitArea = sameServiceFranchisees.stream()
            .mapToInt(SimulationFranchisee::unitArea)
            .average()
            .orElse(0D);
        return Math.round(pyeongUnitCount * averageUnitArea * THOUSAND);
    }

    private SimulationConditionInfo buildCondition(
        SimulationReportCommand command, SimulationServiceType serviceType,
        SimulationRent rent, SimulationFranchisee selectedFranchisee
    ) {
        return SimulationConditionInfo.builder()
            .franchisee(command.franchisee())
            .franchiseeId(selectedFranchisee == null ? null : selectedFranchisee.id())
            .brandName(selectedFranchisee == null ? null : selectedFranchisee.brandName())
            .districtCode(rent.districtCode())
            .districtName(rent.districtName())
            .serviceCode(serviceType.serviceCode())
            .serviceName(serviceType.serviceName())
            .storeSize(command.storeSize())
            .floorType(command.floorType())
            .periodCode(command.periodCode())
            .build();
    }

    /**
     * 유사 프랜차이즈 Top 5 — 예상 총비용과의 절대 차이가 작은 순.
     * 프랜차이즈 총비용 = 부담금 항목 합(천원) + 동일 조건의 임대료·보증금.
     */
    private List<SimulationSimilarFranchiseeInfo> findSimilarFranchisees(
        List<SimulationFranchisee> candidates, long rentPriceWon, long depositWon, long totalWon
    ) {
        return candidates.stream()
            .map(franchisee -> Map.entry(franchisee, franchiseeTotalWon(franchisee, rentPriceWon, depositWon)))
            .sorted(Comparator.comparingLong(entry -> Math.abs(entry.getValue() - totalWon)))
            .limit(SIMILAR_FRANCHISEE_COUNT)
            .map(entry -> SimulationSimilarFranchiseeInfo.builder()
                .franchiseeId(entry.getKey().id())
                .brandName(entry.getKey().brandName())
                .totalPrice(entry.getValue() / TEN_THOUSAND)
                .subscription(entry.getKey().subscription() * THOUSAND / TEN_THOUSAND)
                .education(entry.getKey().education() * THOUSAND / TEN_THOUSAND)
                .deposit(entry.getKey().deposit() * THOUSAND / TEN_THOUSAND)
                .etc(entry.getKey().etc() * THOUSAND / TEN_THOUSAND)
                .interior(entry.getKey().interior() * THOUSAND / TEN_THOUSAND)
                .build())
            .toList();
    }

    private long franchiseeTotalWon(SimulationFranchisee franchisee, long rentPriceWon, long depositWon) {
        long levyAndInteriorWon = (franchisee.subscription() + franchisee.education() + franchisee.deposit()
            + franchisee.etc() + franchisee.interior()) * THOUSAND;
        return levyAndInteriorWon + rentPriceWon + depositWon;
    }

    /**
     * 성별·연령 분석 — 기준 분기의 자치구×업종 매출. 데이터가 없으면 null 로 응답한다.
     */
    private SimulationGenderAgeInfo buildGenderAgeAnalysis(SimulationReportCommand command) {
        Optional<DistrictServiceSalesQueryResult> salesHolder = districtSalesQueryPort
            .findByPeriodCodeAndDistrictCodeAndServiceCode(command.periodCode(), command.districtCode(), command.serviceCode());
        if (salesHolder.isEmpty()) {
            return null;
        }
        DistrictServiceSalesQueryResult sales = salesHolder.get();
        long genderTotal = sales.maleSalesAmount() + sales.femaleSalesAmount();
        if (genderTotal <= 0) {
            return null;
        }

        List<SimulationAgeSalesInfo> topAgeGroups = List.of(
                new SimulationAgeSalesInfo("10대", sales.age10SalesAmount()),
                new SimulationAgeSalesInfo("20대", sales.age20SalesAmount()),
                new SimulationAgeSalesInfo("30대", sales.age30SalesAmount()),
                new SimulationAgeSalesInfo("40대", sales.age40SalesAmount()),
                new SimulationAgeSalesInfo("50대", sales.age50SalesAmount()),
                new SimulationAgeSalesInfo("60대 이상", sales.age60PlusSalesAmount())
            ).stream()
            .sorted(Comparator.comparingLong(SimulationAgeSalesInfo::salesAmount).reversed())
            .limit(TOP_AGE_GROUP_COUNT)
            .map(info -> new SimulationAgeSalesInfo(info.ageGroupName(), info.salesAmount() / TEN_THOUSAND))
            .toList();

        return SimulationGenderAgeInfo.builder()
            .malePercent((double) sales.maleSalesAmount() / genderTotal * 100D)
            .femalePercent((double) sales.femaleSalesAmount() / genderTotal * 100D)
            .topAgeGroups(topAgeGroups)
            .build();
    }

    /**
     * 성수기/비성수기 분석 — 기준 분기가 속한 연도의 분기별 매출에서 최대/최소 분기를 월로 환산.
     * 비교 가능한 분기가 2개 미만이면 null 로 응답한다.
     */
    private SimulationSeasonInfo buildSeasonAnalysis(SimulationReportCommand command) {
        String year = command.periodCode().substring(0, 4);
        List<String> yearPeriodCodes = List.of(year + "1", year + "2", year + "3", year + "4");
        List<DistrictServiceSalesQueryResult> quarterlySales = districtSalesQueryPort
            .findAllByPeriodCodesAndDistrictCodeAndServiceCode(yearPeriodCodes, command.districtCode(), command.serviceCode());
        if (quarterlySales.size() < SEASON_MINIMUM_QUARTERS) {
            return null;
        }

        DistrictServiceSalesQueryResult peak = quarterlySales.stream()
            .max(Comparator.comparingLong(DistrictServiceSalesQueryResult::monthlySalesAmount))
            .orElseThrow();
        DistrictServiceSalesQueryResult offPeak = quarterlySales.stream()
            .min(Comparator.comparingLong(DistrictServiceSalesQueryResult::monthlySalesAmount))
            .orElseThrow();

        return SimulationSeasonInfo.builder()
            .peakMonths(monthsOf(peak.periodCode()))
            .offPeakMonths(monthsOf(offPeak.periodCode()))
            .build();
    }

    private List<Integer> monthsOf(String periodCode) {
        return MONTHS_BY_QUARTER.getOrDefault(periodCode.charAt(periodCode.length() - 1), List.of());
    }
}
