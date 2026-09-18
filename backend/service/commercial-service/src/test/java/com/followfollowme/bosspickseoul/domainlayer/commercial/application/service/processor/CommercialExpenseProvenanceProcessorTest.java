package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseCategoryType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseSourceDataset;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ExpenseCategoryAmount;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 이슈 #415 해상도 사다리 세 갈래를 고정한다. */
@ExtendWith(MockitoExtension.class)
class CommercialExpenseProvenanceProcessorTest {

    private static final String PERIOD = "20261";
    private static final String COMMERCIAL = "3110008";
    private static final String ADMINISTRATION = "11110515";

    @Mock
    private IncomeCommercialRepositoryPort incomeCommercialRepositoryPort;

    @Mock
    private AdministrationIncomeRepositoryPort administrationIncomeRepositoryPort;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @InjectMocks
    private CommercialExpenseProvenanceProcessor processor;

    @Test
    @DisplayName("(1) 상권 네이티브 지출이 있으면 상권 값을 쓰고 행정동을 보러 가지 않는다")
    void getExpense_commercialExpensePresent_usesCommercialScopeWithoutTouchingAdministration() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.of(nativeRow()));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.COMMERCIAL);
        assertThat(info.provenance().scopeCode()).isEqualTo(COMMERCIAL);
        assertThat(info.provenance().scopeName()).isEqualTo("배화여자대학교");
        assertThat(info.provenance().source()).isEqualTo(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION);
        // 네이티브는 대체가 아니므로 면책을 비운다.
        assertThat(info.provenance().disclaimer()).isNull();
        assertThat(info.expenseCategories()).hasSize(9)
            .extracting(ExpenseCategoryAmount::category)
            .doesNotContain(ExpenseCategoryType.LEISURE_CULTURE, ExpenseCategoryType.OTHER, ExpenseCategoryType.DINING);
        assertThat(info.expenseCategorySum()).isEqualTo(410_000L);
        verify(commercialRegionQueryPort, never()).getCommercialAdministration(anyString());
    }

    @Test
    @DisplayName("(2) 상권 지출이 전 행 0 이면 소속 행정동 10항목으로 대체하고 출처를 밝힌다")
    void getExpense_commercialExpenseZeroed_fallsBackToAdministrationProxy() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.of(IncomeCommercial.builder().commercialCode(COMMERCIAL).build()));
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, PERIOD))
            .thenReturn(Optional.of(administrationRow()));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.ADMINISTRATION_PROXY);
        assertThat(info.provenance().scopeCode()).isEqualTo(ADMINISTRATION);
        assertThat(info.provenance().scopeName()).isEqualTo("청운효자동");
        assertThat(info.provenance().effectivePeriodCode()).isEqualTo(PERIOD);
        assertThat(info.provenance().source()).isEqualTo(ExpenseSourceDataset.ADMINISTRATION_CONSUMPTION);
        assertThat(info.provenance().disclaimer()).contains("청운효자동").contains("같은 행정동 안의 상권은 같은 값입니다");
        assertThat(info.expenseCategories()).hasSize(10)
            .extracting(ExpenseCategoryAmount::category)
            .contains(ExpenseCategoryType.LEISURE_CULTURE, ExpenseCategoryType.OTHER, ExpenseCategoryType.DINING)
            .doesNotContain(ExpenseCategoryType.LEISURE, ExpenseCategoryType.CULTURE);
        assertThat(info.expenseCategorySum()).isEqualTo(550L);
    }

    @Test
    @DisplayName("(2) 상권 행 자체가 없어도 404 대신 행정동 대체로 간다")
    void getExpense_commercialRowAbsent_stillFallsBackToAdministrationProxy() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, PERIOD))
            .thenReturn(Optional.of(administrationRow()));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.ADMINISTRATION_PROXY);
        assertThat(info.hasValue()).isTrue();
    }

    @Test
    @DisplayName("(3) 행정동 세부 항목이 NULL 인 레거시 행은 대체 대상이 아니다")
    void getExpense_administrationDetailNotIngested_isNotAProxyCandidate() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, PERIOD))
            .thenReturn(Optional.of(IncomeAdministration.builder()
                .administrationCode(ADMINISTRATION).administrationName("청운효자동")
                .periodCode(PERIOD).totalExpenseAmount(999L)
                .build()));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
        assertThat(info.expenseCategories()).isNull();
    }

    @Test
    @DisplayName("(3) 상권도 행정동도 없으면 값은 null 이고 중단 사실만 전한다")
    void getExpense_nothingAvailable_reportsDiscontinuationOnly() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, PERIOD))
            .thenReturn(Optional.empty());

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.hasValue()).isFalse();
        assertThat(info.expenseCategories()).isNull();
        assertThat(info.expenseCategorySum()).isNull();
        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
        assertThat(info.provenance().scopeCode()).isNull();
        assertThat(info.provenance().effectivePeriodCode()).isNull();
        assertThat(info.provenance().disclaimer()).contains("상권 단위 소비 제공을 중단");
        assertThat(info.provenance().source()).isEqualTo(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION);
    }

    @Test
    @DisplayName("(3) 起점 지역 서비스가 매핑을 404 로 답하면 대체 불가로 흡수한다")
    void getExpense_regionMappingNotFound_isAbsorbedAsUnavailable() {
        // 상권 코드가 지역 서비스에 없는 것은 장애가 아니라 데이터 부재다. 사다리 3단계로 보낸다.
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
        assertThat(info.hasValue()).isFalse();
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
    }

    @Test
    @DisplayName("지역 서비스 장애(503)는 삼키지 않고 그대로 전파한다")
    void getExpense_regionServiceUnavailable_propagates() {
        // 20261 기준 상권 1,650곳이 전부 이 경로를 타므로, 장애를 "소비 데이터 없음" 으로 뭉개면
        // 장애가 정상 응답으로 보이고 서킷도 열리지 않는다.
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE);
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
    }

    @Test
    @DisplayName("(3) 매핑은 있지만 행정동 코드가 비어 있으면 대체하지 않는다")
    void getExpense_resolvedAdministrationCodeIsNull_isUnavailable() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenReturn(new CommercialAdministrationQueryResult("11110", "종로구", null, null));

        CommercialIncomeAndExpenseInfo info = processor.getExpenseByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL);

        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
    }

    @Test
    @DisplayName("미리 읽은 행정동 행은 서버 해석 결과와 코드가 같을 때만 재사용한다")
    void resolve_preloadedAdministrationRow_isReusedOnlyWhenItIsTheResolvedOne() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());

        CommercialIncomeAndExpenseInfo reused = processor.resolve(PERIOD, COMMERCIAL, null, administrationRow());

        assertThat(reused.provenance().scopeCode()).isEqualTo(ADMINISTRATION);
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
    }

    @Test
    @DisplayName("미리 읽은 행이 다른 행정동이면 버리고 해석된 행정동을 다시 읽는다")
    void resolve_preloadedRowFromAnotherAdministration_isDiscarded() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(administrationMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, PERIOD))
            .thenReturn(Optional.of(administrationRow()));
        IncomeAdministration unrelated = IncomeAdministration.builder()
            .periodCode(PERIOD).administrationCode("11680640").administrationName("역삼1동")
            .totalExpenseAmount(9_999L)
            .groceryExpenseAmount(9_000L).clothingExpenseAmount(100L).householdExpenseAmount(100L)
            .medicalExpenseAmount(100L).transportationExpenseAmount(100L).educationExpenseAmount(100L)
            .entertainmentExpenseAmount(100L).leisureCultureExpenseAmount(100L)
            .otherExpenseAmount(100L).diningExpenseAmount(100L)
            .build();

        CommercialIncomeAndExpenseInfo info = processor.resolve(PERIOD, COMMERCIAL, null, unrelated);

        assertThat(info.provenance().scopeCode()).isEqualTo(ADMINISTRATION);
        assertThat(info.provenance().scopeName()).isEqualTo("청운효자동");
        assertThat(info.expenseCategorySum()).isEqualTo(550L);
    }

    private static IncomeCommercial nativeRow() {
        return IncomeCommercial.builder()
            .periodCode(PERIOD)
            .commercialCode(COMMERCIAL)
            .commercialName("배화여자대학교")
            .groceryExpenseAmount(320_000L)
            .cultureExpenseAmount(90_000L)
            .build();
    }

    private static CommercialAdministrationQueryResult administrationMapping() {
        return new CommercialAdministrationQueryResult("11110", "종로구", ADMINISTRATION, "청운효자동");
    }

    private static IncomeAdministration administrationRow() {
        return IncomeAdministration.builder()
            .periodCode(PERIOD)
            .administrationCode(ADMINISTRATION)
            .administrationName("청운효자동")
            .totalExpenseAmount(550L)
            .groceryExpenseAmount(100L)
            .clothingExpenseAmount(90L)
            .householdExpenseAmount(80L)
            .medicalExpenseAmount(70L)
            .transportationExpenseAmount(60L)
            .educationExpenseAmount(50L)
            .entertainmentExpenseAmount(40L)
            .leisureCultureExpenseAmount(30L)
            .otherExpenseAmount(20L)
            .diningExpenseAmount(10L)
            .build();
    }
}
