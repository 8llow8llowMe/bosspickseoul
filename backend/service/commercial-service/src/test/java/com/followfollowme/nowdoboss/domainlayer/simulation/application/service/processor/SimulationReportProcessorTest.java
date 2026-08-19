package com.followfollowme.nowdoboss.domainlayer.simulation.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.followfollowme.nowdoboss.domainlayer.simulation.application.command.SimulationReportCommand;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.exception.SimulationErrorCode;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.exception.SimulationException;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.info.SimulationReportInfo;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.DistrictSalesQueryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationRentRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query.DistrictServiceSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationFranchisee;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationRent;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationServiceType;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SimulationReportProcessorTest {

    private static final String DISTRICT = "11740";
    private static final String SERVICE = "CS100001";
    private static final String PERIOD = "20233";

    @Mock
    private SimulationServiceTypeRepositoryPort serviceTypePort;

    @Mock
    private SimulationRentRepositoryPort rentPort;

    @Mock
    private SimulationFranchiseeRepositoryPort franchiseePort;

    @Mock
    private DistrictSalesQueryPort districtSalesQueryPort;

    @InjectMocks
    private SimulationReportProcessor processor;

    @BeforeEach
    void setUp() {
        lenient().when(serviceTypePort.findByServiceCode(SERVICE)).thenReturn(Optional.of(serviceType()));
        // 3.3㎡당 1층 10만원 / 1층 외 5만원
        lenient().when(rentPort.findByDistrictCode(DISTRICT)).thenReturn(Optional.of(
            SimulationRent.builder()
                .districtCode(DISTRICT).districtName("강동구")
                .firstFloorRent(100_000).otherFloorRent(50_000).totalRent(75_000)
                .build()));
        lenient().when(districtSalesQueryPort.findByPeriodCodeAndDistrictCodeAndServiceCode(anyString(), anyString(), anyString()))
            .thenReturn(Optional.empty());
        lenient().when(districtSalesQueryPort.findAllByPeriodCodesAndDistrictCodeAndServiceCode(anyList(), anyString(), anyString()))
            .thenReturn(List.of());
    }

    @Test
    void simulate_franchisee_calculatesRentDepositLevyInteriorAndTotal() {
        // 66㎡ → 20단위, 임대료 200만원, 보증금 2,000만원, 부담금 10,000만원, 인테리어 5,000만원
        when(franchiseePort.findById(1L)).thenReturn(Optional.of(
            franchisee(1L, "본죽", 100_000, 50_000, 2_500)));
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(List.of());

        SimulationReportInfo report = processor.simulate(command(true, 1L, SimulationFloorType.FIRST_FLOOR));

        assertThat(report.costDetail().rentPrice()).isEqualTo(200L);
        assertThat(report.costDetail().deposit()).isEqualTo(2_000L);
        assertThat(report.costDetail().levy()).isEqualTo(10_000L);
        assertThat(report.costDetail().interior()).isEqualTo(5_000L);
        assertThat(report.totalPrice()).isEqualTo(17_200L);
        assertThat(report.condition().brandName()).isEqualTo("본죽");
    }

    @Test
    void simulate_nonFranchisee_estimatesInteriorFromServiceAverageUnitArea() {
        // 같은 업종 프랜차이즈 unitArea 평균(2,000 / 4,000 → 3,000천원) × 20단위 = 6,000만원
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(List.of(
            franchiseeWithUnitArea(11L, 2_000),
            franchiseeWithUnitArea(12L, 4_000)));

        SimulationReportInfo report = processor.simulate(command(false, null, SimulationFloorType.FIRST_FLOOR));

        assertThat(report.costDetail().levy()).isNull();
        assertThat(report.costDetail().interior()).isEqualTo(6_000L);
        assertThat(report.totalPrice()).isEqualTo(200L + 2_000L + 6_000L);
        assertThat(report.condition().brandName()).isNull();
    }

    @Test
    void simulate_otherFloor_usesOtherFloorRent() {
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(List.of());

        SimulationReportInfo report = processor.simulate(command(false, null, SimulationFloorType.OTHER));

        assertThat(report.costDetail().rentPrice()).isEqualTo(100L);
        assertThat(report.costDetail().deposit()).isEqualTo(1_000L);
    }

    @Test
    void simulate_franchiseeWithoutId_throwsFranchiseeRequired() {
        assertThatThrownBy(() -> processor.simulate(command(true, null, SimulationFloorType.FIRST_FLOOR)))
            .isInstanceOf(SimulationException.class)
            .extracting(t -> ((SimulationException) t).getErrorCode())
            .isEqualTo(SimulationErrorCode.FRANCHISEE_REQUIRED);
    }

    @Test
    void simulate_similarFranchisees_sortedByAbsoluteBudgetDifferenceTopFive() {
        // 내 총비용: 임대 200 + 보증 2,000 + 인테리어 0 = 2,200만원 (프랜차이즈 후보 없음 평균 0)
        // 후보 총비용 = 부담금 합(천원)×1000 + 임대·보증. diff 가 작은 순으로 정렬돼야 한다.
        List<SimulationFranchisee> candidates = List.of(
            franchisee(21L, "가까움", 0, 1_000, 0),   // +100만원 차이
            franchisee(22L, "중간", 0, 30_000, 0),    // +3,000만원
            franchisee(23L, "가장가까움", 0, 0, 0),   // 0 차이
            franchisee(24L, "멀리", 0, 500_000, 0),   // +50,000만원
            franchisee(25L, "조금멀리", 0, 60_000, 0),
            franchisee(26L, "제일멀리", 0, 900_000, 0)
        );
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(candidates);

        SimulationReportInfo report = processor.simulate(command(false, null, SimulationFloorType.FIRST_FLOOR));

        assertThat(report.similarFranchisees()).hasSize(5);
        assertThat(report.similarFranchisees().get(0).brandName()).isEqualTo("가장가까움");
        assertThat(report.similarFranchisees().get(1).brandName()).isEqualTo("가까움");
        assertThat(report.similarFranchisees())
            .extracting(f -> f.brandName())
            .doesNotContain("제일멀리");
    }

    @Test
    void simulate_seasonAnalysis_mapsPeakAndOffPeakQuartersToMonths() {
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(List.of());
        when(districtSalesQueryPort.findAllByPeriodCodesAndDistrictCodeAndServiceCode(anyList(), anyString(), anyString()))
            .thenReturn(List.of(
                quarterSales("20231", 100L),
                quarterSales("20232", 400L),
                quarterSales("20233", 900L),
                quarterSales("20234", 50L)));

        SimulationReportInfo report = processor.simulate(command(false, null, SimulationFloorType.FIRST_FLOOR));

        assertThat(report.seasonAnalysis().peakMonths()).containsExactly(7, 8, 9);
        assertThat(report.seasonAnalysis().offPeakMonths()).containsExactly(10, 11, 12);
    }

    @Test
    void simulate_genderAgeAnalysis_computesPercentagesAndTopThreeAgeGroups() {
        when(franchiseePort.findAllByServiceCode(SERVICE)).thenReturn(List.of());
        when(districtSalesQueryPort.findByPeriodCodeAndDistrictCodeAndServiceCode(PERIOD, DISTRICT, SERVICE))
            .thenReturn(Optional.of(DistrictServiceSalesQueryResult.builder()
                .periodCode(PERIOD)
                .monthlySalesAmount(1_000_000L)
                .maleSalesAmount(600_000L)
                .femaleSalesAmount(400_000L)
                .age10SalesAmount(10_000L)
                .age20SalesAmount(500_000L)
                .age30SalesAmount(300_000L)
                .age40SalesAmount(100_000L)
                .age50SalesAmount(50_000L)
                .age60PlusSalesAmount(40_000L)
                .build()));

        SimulationReportInfo report = processor.simulate(command(false, null, SimulationFloorType.FIRST_FLOOR));

        assertThat(report.genderAgeAnalysis().malePercent()).isEqualTo(60D);
        assertThat(report.genderAgeAnalysis().femalePercent()).isEqualTo(40D);
        assertThat(report.genderAgeAnalysis().topAgeGroups())
            .extracting(a -> a.ageGroupName())
            .containsExactly("20대", "30대", "40대");
    }

    private SimulationReportCommand command(boolean franchisee, Long franchiseeId, SimulationFloorType floorType) {
        return SimulationReportCommand.builder()
            .franchisee(franchisee)
            .franchiseeId(franchiseeId)
            .districtCode(DISTRICT)
            .serviceCode(SERVICE)
            .storeSize(66)
            .floorType(floorType)
            .periodCode(PERIOD)
            .build();
    }

    private SimulationServiceType serviceType() {
        return SimulationServiceType.builder()
            .id(1L).serviceCode(SERVICE).serviceName("한식음식점")
            .smallSize(36).mediumSize(65).largeSize(94)
            .keyMoneyAverage(5_670).keyMoneyLevel(75.3D).keyMoneyRatio(75.4D)
            .build();
    }

    private SimulationFranchisee franchisee(long id, String brandName, int totalLevyThousand, int interiorThousand, int unitAreaThousand) {
        return SimulationFranchisee.builder()
            .id(id).serviceCode(SERVICE).serviceName("한식음식점").brandName(brandName)
            .subscription(0).education(0).deposit(0).etc(0)
            .totalLevy(totalLevyThousand).unitArea(unitAreaThousand).interior(interiorThousand).area(66)
            .build();
    }

    private SimulationFranchisee franchiseeWithUnitArea(long id, int unitAreaThousand) {
        return franchisee(id, "브랜드" + id, 0, 0, unitAreaThousand);
    }

    private DistrictServiceSalesQueryResult quarterSales(String periodCode, long monthlySales) {
        return DistrictServiceSalesQueryResult.builder()
            .periodCode(periodCode)
            .monthlySalesAmount(monthlySales)
            .build();
    }
}
