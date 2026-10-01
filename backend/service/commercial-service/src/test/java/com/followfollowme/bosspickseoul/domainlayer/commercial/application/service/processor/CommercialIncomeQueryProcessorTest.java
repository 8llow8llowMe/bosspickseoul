package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.IncomeScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.DistrictPensionIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * {@code /income} 조립이 소비 대체와 소득 대체에 <b>지역 서비스 응답 하나</b>를 나눠 주는지 고정한다. (이슈 #415)
 *
 * <p>두 판정을 목으로 대체하지 않는다. 둘이 실제로 같은 조회를 쓰는지가 이 테스트의 관심사라, 각자 포트를 부르게 바뀌면
 * Feign 호출 수로 드러나야 한다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialIncomeQueryProcessorTest {

    private static final String COMMERCIAL = "3110008";
    private static final String DISTRICT = "11110";
    private static final String ADMINISTRATION = "11110515";

    @Mock
    private IncomeCommercialRepositoryPort incomeCommercialRepositoryPort;

    @Mock
    private AdministrationIncomeRepositoryPort administrationIncomeRepositoryPort;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @Mock
    private DistrictPensionIncomeRepositoryPort districtPensionIncomeRepositoryPort;

    private CommercialIncomeQueryProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new CommercialIncomeQueryProcessor(
            commercialRegionQueryPort,
            new CommercialExpenseProvenanceProcessor(incomeCommercialRepositoryPort, administrationIncomeRepositoryPort, commercialRegionQueryPort),
            new CommercialDistrictIncomeProcessor(districtPensionIncomeRepositoryPort));
    }

    @Test
    @DisplayName("소비 행정동 대체와 소득 자치구 대체가 지역 서비스 응답 하나를 나눠 쓴다 - Feign 은 한 번")
    void getIncome_proxyExpenseAndDistrictIncome_shareOneRegionLookup() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode("20261", COMMERCIAL)).thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(jongnoMapping());
        when(administrationIncomeRepositoryPort.findIncomeByAdministrationCode(ADMINISTRATION, "20261"))
            .thenReturn(Optional.of(administrationRow()));
        when(districtPensionIncomeRepositoryPort.findLatestByDistrictCodeOnOrBefore(DISTRICT, LocalDate.of(2026, 3, 31)))
            .thenReturn(Optional.of(jongnoRow(LocalDate.of(2024, 12, 31))));

        CommercialIncomeAndExpenseResponseInfo info = processor.getIncome("20261", COMMERCIAL);

        assertThat(info.expense().provenance().scope()).isEqualTo(ExpenseScopeType.ADMINISTRATION_PROXY);
        assertThat(info.expense().provenance().scopeCode()).isEqualTo(ADMINISTRATION);
        assertThat(info.districtAverageIncome().provenance().scope()).isEqualTo(IncomeScopeType.DISTRICT_PROXY);
        assertThat(info.districtAverageIncome().amount()).isEqualTo(1_555_244L);
        verify(commercialRegionQueryPort, times(1)).getCommercialAdministration(COMMERCIAL);
    }

    @Test
    @DisplayName("소비가 상권 네이티브여도 소득 대체는 자치구를 알아야 하므로 지역 서비스를 한 번 부른다")
    void getIncome_nativeExpense_stillResolvesDistrictOnce() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode("20233", COMMERCIAL))
            .thenReturn(Optional.of(nativeRow("20233")));
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(jongnoMapping());
        when(districtPensionIncomeRepositoryPort.findLatestByDistrictCodeOnOrBefore(DISTRICT, LocalDate.of(2023, 9, 30)))
            .thenReturn(Optional.of(jongnoRow(LocalDate.of(2022, 12, 31))));

        CommercialIncomeAndExpenseResponseInfo info = processor.getIncome("20233", COMMERCIAL);

        assertThat(info.expense().provenance().scope()).isEqualTo(ExpenseScopeType.COMMERCIAL);
        assertThat(info.districtAverageIncome().provenance().referenceDate()).isEqualTo(LocalDate.of(2022, 12, 31));
        verify(commercialRegionQueryPort, times(1)).getCommercialAdministration(COMMERCIAL);
        verify(administrationIncomeRepositoryPort, never()).findIncomeByAdministrationCode(anyString(), anyString());
    }

    @Test
    @DisplayName("상권 매핑이 없으면(404) 두 지표 모두 제공 없음이고 지역 서비스는 한 번만 부른다")
    void getIncome_regionNotFound_bothUnavailableWithOneCall() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode("20261", COMMERCIAL)).thenReturn(Optional.empty());
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND));

        CommercialIncomeAndExpenseResponseInfo info = processor.getIncome("20261", COMMERCIAL);

        assertThat(info.expense().provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
        assertThat(info.districtAverageIncome().provenance().scope()).isEqualTo(IncomeScopeType.UNAVAILABLE);
        assertThat(info.districtAverageIncome().amount()).isNull();
        verify(commercialRegionQueryPort, times(1)).getCommercialAdministration(COMMERCIAL);
        verify(districtPensionIncomeRepositoryPort, never()).findLatestByDistrictCodeOnOrBefore(anyString(), any());
    }

    @Test
    @DisplayName("소비가 네이티브라 소비 쪽이 지역 서비스를 안 불러도, 소득 쪽 503 은 삼키지 않는다")
    void getIncome_regionServiceUnavailable_propagatesThroughDistrictIncome() {
        when(incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode("20233", COMMERCIAL))
            .thenReturn(Optional.of(nativeRow("20233")));
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> processor.getIncome("20233", COMMERCIAL))
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE);
    }

    private static CommercialAdministrationQueryResult jongnoMapping() {
        return new CommercialAdministrationQueryResult(DISTRICT, "종로구", ADMINISTRATION, "청운효자동");
    }

    private static IncomeCommercial nativeRow(String periodCode) {
        return IncomeCommercial.builder()
            .periodCode(periodCode)
            .commercialCode(COMMERCIAL)
            .commercialName("배화여자대학교")
            .groceryExpenseAmount(320_000L)
            .build();
    }

    private static IncomeAdministration administrationRow() {
        return IncomeAdministration.builder()
            .periodCode("20261")
            .administrationCode(ADMINISTRATION)
            .administrationName("청운효자동")
            .totalExpenseAmount(550L)
            .groceryExpenseAmount(100L).clothingExpenseAmount(90L).householdExpenseAmount(80L)
            .medicalExpenseAmount(70L).transportationExpenseAmount(60L).educationExpenseAmount(50L)
            .entertainmentExpenseAmount(40L).leisureCultureExpenseAmount(30L)
            .otherExpenseAmount(20L).diningExpenseAmount(10L)
            .build();
    }

    private static PensionIncomeDistrict jongnoRow(LocalDate referenceDate) {
        return PensionIncomeDistrict.builder()
            .id(1L)
            .referenceDate(referenceDate)
            .districtCode(DISTRICT)
            .districtName("종로구")
            .averageMonthlyIncomeAmount(1_555_244L)
            .build();
    }
}
