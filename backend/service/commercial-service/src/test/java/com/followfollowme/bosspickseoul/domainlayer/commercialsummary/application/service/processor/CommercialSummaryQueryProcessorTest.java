package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private CommercialSummaryQueryProcessor processor;

    @Test
    @DisplayName("상권 지출 행이 없어도 요약 전체가 실패하지 않고 그 단위만 비워진다")
    void getIncomeSummary_commercialRowAbsent_degradesOnlyThatRegion() {
        // 이슈 #413: 2024년 이후 1,650개 상권 중 560곳은 income_commercial 행 자체가 없다.
        when(commercialSummaryRepositoryPort.findIncomeDistrict(PERIOD, DISTRICT))
            .thenReturn(Optional.of(IncomeDistrict.builder()
                .districtCode(DISTRICT).districtName("강남구").totalExpenseAmount(1_000L).build()));
        when(commercialSummaryRepositoryPort.findIncomeAdministration(PERIOD, ADMINISTRATION))
            .thenReturn(Optional.of(IncomeAdministration.builder()
                .administrationCode(ADMINISTRATION).administrationName("역삼1동").totalExpenseAmount(500L).build()));
        when(commercialSummaryRepositoryPort.findIncomeCommercial(PERIOD, COMMERCIAL)).thenReturn(Optional.empty());

        CommercialIncomeSummaryInfo info = processor.getIncomeSummary(PERIOD, DISTRICT, ADMINISTRATION, COMMERCIAL);

        assertThat(info.district().totalExpenseAmount()).isEqualTo(1_000L);
        assertThat(info.administration().totalExpenseAmount()).isEqualTo(500L);
        assertThat(info.commercial()).isNull();
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
    }
}
