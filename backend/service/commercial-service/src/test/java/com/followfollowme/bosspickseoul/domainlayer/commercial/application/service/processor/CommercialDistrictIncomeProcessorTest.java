package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialDistrictAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.IncomeScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.IncomeSourceDataset;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.DistrictPensionIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 자치구 평균 소득(대체) 판정을 고정한다. (이슈 #415)
 *
 * <p>「분기 말일 이하 최신 기준일」 자체는 DB 가 고른다 — 그 의미는 {@code PensionIncomeDistrictRepositoryTest} 가 실제
 * 스키마에서 같은 세 분기로 본다. 여기서는 판정이 요청 분기를 어떤 날짜로 바꿔 묻는지와, 값이 없는 갈래가 전부
 * 「제공 없음」으로 모이는지를 본다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialDistrictIncomeProcessorTest {

    private static final String COMMERCIAL = "3110008";
    private static final String DISTRICT = "11110";

    @Mock
    private DistrictPensionIncomeRepositoryPort districtPensionIncomeRepositoryPort;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @InjectMocks
    private CommercialDistrictIncomeProcessor processor;

    @ParameterizedTest(name = "{0} -> {1} 이하 최신 기준일 {2}")
    @CsvSource({
        "20211, 2021-03-31, 2020-12-31",
        "20244, 2024-12-31, 2024-12-31",
        "20261, 2026-03-31, 2024-12-31"
    })
    @DisplayName("요청 분기 말일 이하에서 가장 최근 기준일의 자치구 평균을 쓰고 출처를 밝힌다")
    void resolve_usesLatestReferenceDateOnOrBeforeQuarterEnd(String periodCode, LocalDate quarterEnd, LocalDate referenceDate) {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(jongnoMapping());
        when(districtPensionIncomeRepositoryPort.findLatestByDistrictCodeOnOrBefore(DISTRICT, quarterEnd))
            .thenReturn(Optional.of(jongnoRow(referenceDate)));

        CommercialDistrictAverageIncomeInfo info = processor.resolve(periodCode, lookup());

        assertThat(info.hasValue()).isTrue();
        assertThat(info.amount()).isEqualTo(1_555_244L);
        assertThat(info.provenance().scope()).isEqualTo(IncomeScopeType.DISTRICT_PROXY);
        assertThat(info.provenance().scopeCode()).isEqualTo(DISTRICT);
        assertThat(info.provenance().scopeName()).isEqualTo("종로구");
        assertThat(info.provenance().referenceDate()).isEqualTo(referenceDate);
        assertThat(info.provenance().source()).isEqualTo(IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME);
        assertThat(info.provenance().disclaimer()).contains("종로구 평균", "기준일 " + referenceDate);
    }

    @Test
    @DisplayName("요청 분기 말일 이전 자료가 없으면 값 없이 사유만 남긴다")
    void resolve_noReferenceDateOnOrBeforeQuarterEnd_isUnavailable() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(jongnoMapping());
        when(districtPensionIncomeRepositoryPort.findLatestByDistrictCodeOnOrBefore(DISTRICT, LocalDate.of(2020, 9, 30)))
            .thenReturn(Optional.empty());

        CommercialDistrictAverageIncomeInfo info = processor.resolve("20203", lookup());

        assertUnavailable(info);
    }

    @ParameterizedTest(name = "[{0}]")
    @NullSource
    @ValueSource(strings = {"2024", "20245", "abcde"})
    @DisplayName("분기 형식이 틀리면 지역 서비스도 DB 도 보지 않고 제공 없음이다")
    void resolve_malformedPeriodCode_isUnavailableWithoutLookingAnything(String periodCode) {
        CommercialDistrictAverageIncomeInfo info = processor.resolve(periodCode, lookup());

        assertUnavailable(info);
        verifyNoInteractions(commercialRegionQueryPort, districtPensionIncomeRepositoryPort);
    }

    @Test
    @DisplayName("상권 매핑이 없으면(404) DB 를 보지 않고 제공 없음이다")
    void resolve_regionNotFound_isUnavailable() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND));

        CommercialDistrictAverageIncomeInfo info = processor.resolve("20261", lookup());

        assertUnavailable(info);
        verifyNoInteractions(districtPensionIncomeRepositoryPort);
    }

    @Test
    @DisplayName("매핑은 있지만 자치구 코드가 비어 있으면 DB 를 보지 않고 제공 없음이다")
    void resolve_resolvedDistrictCodeIsNull_isUnavailable() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenReturn(new CommercialAdministrationQueryResult(null, null, "11110515", "청운효자동"));

        CommercialDistrictAverageIncomeInfo info = processor.resolve("20261", lookup());

        assertUnavailable(info);
        verifyNoInteractions(districtPensionIncomeRepositoryPort);
    }

    @Test
    @DisplayName("지역 서비스 장애(503)는 「소득 없음」으로 뭉개지 않고 전파한다")
    void resolve_regionServiceUnavailable_propagates() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> processor.resolve("20261", lookup()))
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE);
        verifyNoInteractions(districtPensionIncomeRepositoryPort);
    }

    private CommercialRegionLookup lookup() {
        return CommercialRegionLookup.of(commercialRegionQueryPort, COMMERCIAL);
    }

    private static void assertUnavailable(CommercialDistrictAverageIncomeInfo info) {
        assertThat(info.hasValue()).isFalse();
        assertThat(info.amount()).isNull();
        assertThat(info.provenance().scope()).isEqualTo(IncomeScopeType.UNAVAILABLE);
        assertThat(info.provenance().scopeCode()).isNull();
        assertThat(info.provenance().scopeName()).isNull();
        assertThat(info.provenance().referenceDate()).isNull();
        assertThat(info.provenance().source()).isEqualTo(IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME);
        assertThat(info.provenance().disclaimer()).isEqualTo(IncomeScopeType.UNAVAILABLE.disclaimer(null, null));
    }

    private static CommercialAdministrationQueryResult jongnoMapping() {
        return new CommercialAdministrationQueryResult(DISTRICT, "종로구", "11110515", "청운효자동");
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
