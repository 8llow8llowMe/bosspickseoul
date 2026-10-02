package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialSalesPerStoreSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryException;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor.CommercialSummaryQueryProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 벤치마크가 점포당 매출 지수를 매출 요약에 이어 붙이는 자리를 본다(이슈 #485). 지수 계산과 점포 조회는 각자의 테스트가 본다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialBenchmarkQueryProcessorTest {

    private static final String PERIOD = "20261";
    private static final String COFFEE = "CS100010";
    private static final String COMMERCIAL = "3110438";

    // 의존이 아니다. 상권명을 얻으려고 매출 행을 다시 읽지 않음을 고정하려고 둔다(다시 주입되면 verify 가 잡는다).
    @Mock
    private CommercialQueryProcessor commercialQueryProcessor;

    @Mock
    private CommercialSummaryQueryProcessor commercialSummaryQueryProcessor;

    @Mock
    private CommercialSalesPerStoreProcessor commercialSalesPerStoreProcessor;

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @InjectMocks
    private CommercialBenchmarkQueryProcessor processor;

    @BeforeEach
    void stubRegion() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenReturn(new CommercialAdministrationQueryResult("11350", "노원구", "11350600", "공릉2동"));
    }

    @Test
    @DisplayName("이미 읽은 매출 요약을 그대로 넘겨 점포당 매출 지수를 만들고 벤치마크에 싣는다")
    void attachesSalesPerStoreBuiltFromTheSameSalesSummary() {
        CommercialSalesSummaryInfo salesSummary = CommercialSalesSummaryInfo.builder().periodCode(PERIOD)
            .commercial(RegionalSalesSummaryInfo.builder().code(COMMERCIAL).name("경춘선숲길 우측").build()).build();
        CommercialSalesPerStoreSummaryInfo salesPerStore = CommercialSalesPerStoreSummaryInfo.builder()
            .serviceCode(COFFEE).indexVsDistrict(43.3).indexVsAdministration(63.4).build();
        when(commercialSummaryQueryProcessor.getSalesSummary(PERIOD, "11350", "11350600", COMMERCIAL, COFFEE)).thenReturn(salesSummary);
        when(commercialSalesPerStoreProcessor.getSalesPerStore(PERIOD, COFFEE, salesSummary)).thenReturn(salesPerStore);
        when(commercialSummaryQueryProcessor.getIncomeSummary(PERIOD, "11350", "11350600", COMMERCIAL))
            .thenReturn(CommercialIncomeSummaryInfo.builder().build());

        CommercialBenchmarkInfo info = processor.getBenchmarks(PERIOD, COMMERCIAL, COFFEE);

        assertThat(info.salesPerStore()).isSameAs(salesPerStore);
        assertThat(info.salesSummary()).isSameAs(salesSummary);
        assertThat(info.commercialName()).isEqualTo("경춘선숲길 우측");
        verifyNoInteractions(commercialQueryProcessor);
    }

    @Test
    @DisplayName("매출 행이 없으면 지금처럼 404 로 끝나고 점포는 읽지 않는다")
    void salesNotFoundStaysNotFoundAndSkipsStores() {
        when(commercialSummaryQueryProcessor.getSalesSummary(PERIOD, "11350", "11350600", COMMERCIAL, COFFEE))
            .thenThrow(new CommercialSummaryException(CommercialSummaryErrorCode.SALES_NOT_FOUND, "자치구"));

        assertThatThrownBy(() -> processor.getBenchmarks(PERIOD, COMMERCIAL, COFFEE))
            .isInstanceOf(CommercialSummaryException.class);
        verify(commercialSalesPerStoreProcessor, never()).getSalesPerStore(anyString(), anyString(), any());
    }
}
