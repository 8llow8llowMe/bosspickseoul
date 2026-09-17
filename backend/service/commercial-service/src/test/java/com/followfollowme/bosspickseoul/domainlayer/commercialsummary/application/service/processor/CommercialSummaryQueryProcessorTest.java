package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialExpenseProvenanceProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommercialSummaryQueryProcessorTest {

    private static final String PERIOD = "20261";
    private static final String DISTRICT = "11680";
    private static final String ADMINISTRATION = "11680640";
    private static final String COMMERCIAL = "3110971";

    @Mock
    private CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;

    @Mock
    private IncomeCommercialRepositoryPort incomeCommercialRepositoryPort;

    @Mock
    private AdministrationIncomeRepositoryPort administrationIncomeRepositoryPort;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    private CommercialSummaryQueryProcessor processor;

    @BeforeEach
    void setUp() {
        // 사다리 판정을 목으로 대체하지 않는다 - 요약이 /income 과 같은 판정을 쓰는지가 이 테스트의 관심사다.
        processor = new CommercialSummaryQueryProcessor(
            commercialSummaryRepositoryPort,
            new CommercialExpenseProvenanceProcessor(
                incomeCommercialRepositoryPort, administrationIncomeRepositoryPort, commercialRegionQueryPort));
    }

    @Test
    @DisplayName("상권 지출 행이 없고 행정동 세부 항목도 없으면 그 단위만 비워지고 요약 전체는 살아남는다")
    void getIncomeSummary_commercialRowAbsent_degradesOnlyThatRegion() {
        // 이슈 #413: 2024년 이후 1,650개 상권 중 560곳은 income_commercial 행 자체가 없다.
        stubDistrict(1_000L);
        // 세부 10항목이 NULL 인 레거시 행이라 대체 대상이 아니다. (이슈 #415)
        stubAdministration(IncomeAdministration.builder()
            .periodCode(PERIOD).administrationCode(ADMINISTRATION).administrationName("역삼1동").totalExpenseAmount(500L).build());
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL)).thenReturn(Optional.empty());

        CommercialIncomeSummaryInfo info = processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        assertThat(info.district().totalExpenseAmount()).isEqualTo(1_000L);
        assertThat(info.administration().totalExpenseAmount()).isEqualTo(500L);
        assertThat(info.commercial()).isNull();
        assertThat(info.commercialProvenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
    }

    @Test
    @DisplayName("상권 지출이 미제공이면 행정동 총액으로 대체하고 출처를 밝힌다")
    void getIncomeSummary_commercialExpenseUnavailable_substitutesAdministrationTotal() {
        // 이슈 #415: 상권 leg 는 총액만 대체한다. 자치구·행정동 leg 는 원천이 살아 있으므로 그대로 둔다.
        stubDistrict(1_000L);
        stubAdministration(administrationRowWithDetails());
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL))
            .thenReturn(Optional.of(IncomeCommercial.builder()
                .commercialCode(COMMERCIAL).commercialName("선정릉역 4번 출구").build()));

        CommercialIncomeSummaryInfo info = processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        assertThat(info.commercial().totalExpenseAmount()).isEqualTo(550L);
        // 대체를 써도 leg 자체는 상권으로 남는다. 코드까지 행정동으로 바꾸면 화면에 같은 행정동이 두 번 나온다.
        assertThat(info.commercial().code()).isEqualTo(COMMERCIAL);
        assertThat(info.commercial().name()).isEqualTo("선정릉역 4번 출구");
        assertThat(info.commercialProvenance().scope()).isEqualTo(ExpenseScopeType.ADMINISTRATION_PROXY);
        assertThat(info.commercialProvenance().scopeCode()).isEqualTo(ADMINISTRATION);
        assertThat(info.commercialProvenance().disclaimer()).contains("역삼1동");
        assertThat(info.district().totalExpenseAmount()).isEqualTo(1_000L);
        assertThat(info.administration().totalExpenseAmount()).isEqualTo(500L);
    }

    @Test
    @DisplayName("대체할 때도 행정동 소비 행은 한 번만 읽는다")
    void getIncomeSummary_proxyPath_readsAdministrationIncomeOnce() {
        // 행정동 leg 를 채우며 읽은 행을 사다리가 그대로 재사용한다. 다시 조회하면 요약 한 번에 같은 행을 두 번 읽는다.
        stubDistrict(1_000L);
        stubAdministration(administrationRowWithDetails());
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL)).thenReturn(Optional.empty());

        processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        verify(commercialSummaryRepositoryPort, times(1)).findIncomeAdministration(PERIOD, ADMINISTRATION);
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
        // 요약은 행정동 코드를 요청으로 받으므로 상권 -> 행정동 해석을 위한 지역 서비스 왕복도 필요 없다.
        verify(commercialRegionQueryPort, never()).getCommercialAdministration(anyString());
        verify(incomeCommercialRepositoryPort, never()).findByPeriodCodeAndCommercialCode(anyString(), anyString());
    }

    @Test
    @DisplayName("지출이 있는 상권은 9항목 합을 그대로 내려주고 대체하지 않는다")
    void getIncomeSummary_commercialExpensePresent_reportsTheCategorySum() {
        when(commercialSummaryRepositoryPort.findIncomeDistrict(PERIOD, DISTRICT)).thenReturn(Optional.empty());
        when(commercialSummaryRepositoryPort.findIncomeAdministration(PERIOD, ADMINISTRATION)).thenReturn(Optional.empty());
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL))
            .thenReturn(Optional.of(IncomeCommercial.builder()
                .periodCode(PERIOD).commercialCode(COMMERCIAL).commercialName("선정릉역 4번 출구")
                .totalExpenseAmount(410_000L)
                .groceryExpenseAmount(320_000L).cultureExpenseAmount(90_000L)
                .build()));

        CommercialIncomeSummaryInfo info = processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        assertThat(info.commercial().totalExpenseAmount()).isEqualTo(410_000L);
        assertThat(info.commercialProvenance().scope()).isEqualTo(ExpenseScopeType.COMMERCIAL);
        assertThat(info.commercialProvenance().disclaimer()).isNull();
    }

    @Test
    @DisplayName("세 단위 모두 행이 없어도 예외 대신 빈 요약을 돌려준다")
    void getIncomeSummary_allRowsAbsent_returnsEmptySummaryInsteadOfThrowing() {
        when(commercialSummaryRepositoryPort.findIncomeDistrict(PERIOD, DISTRICT)).thenReturn(Optional.empty());
        when(commercialSummaryRepositoryPort.findIncomeAdministration(PERIOD, ADMINISTRATION)).thenReturn(Optional.empty());
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL)).thenReturn(Optional.empty());

        CommercialIncomeSummaryInfo info = processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        assertThat(info.district()).isNull();
        assertThat(info.administration()).isNull();
        assertThat(info.commercial()).isNull();
        assertThat(info.commercialProvenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
    }

    private void stubDistrict(long totalExpenseAmount) {
        when(commercialSummaryRepositoryPort.findIncomeDistrict(PERIOD, DISTRICT))
            .thenReturn(Optional.of(IncomeDistrict.builder()
                .districtCode(DISTRICT).districtName("강남구").totalExpenseAmount(totalExpenseAmount).build()));
    }

    private void stubAdministration(IncomeAdministration row) {
        when(commercialSummaryRepositoryPort.findIncomeAdministration(PERIOD, ADMINISTRATION)).thenReturn(Optional.of(row));
    }

    private static IncomeAdministration administrationRowWithDetails() {
        return IncomeAdministration.builder()
            .periodCode(PERIOD)
            .administrationCode(ADMINISTRATION)
            .administrationName("역삼1동")
            .totalExpenseAmount(500L)
            .groceryExpenseAmount(100L).clothingExpenseAmount(90L).householdExpenseAmount(80L)
            .medicalExpenseAmount(70L).transportationExpenseAmount(60L).educationExpenseAmount(50L)
            .entertainmentExpenseAmount(40L).leisureCultureExpenseAmount(30L)
            .otherExpenseAmount(20L).diningExpenseAmount(10L)
            .build();
    }
}
