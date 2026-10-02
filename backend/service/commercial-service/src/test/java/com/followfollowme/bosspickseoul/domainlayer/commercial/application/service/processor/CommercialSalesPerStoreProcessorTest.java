package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialSalesPerStoreSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 점포당 매출 지수의 조회 쪽을 본다(이슈 #485) — 매출 요약이 정한 세 단위 코드로 점포를 한 번씩만 읽고, 점포 수는 업종 전체
 * ({@code similarStoreCount})를 쓰며, 점포 행이 없어도 404 로 끊지 않는다. 계산식은 {@code CommercialSalesPerStoreSummaryInfoTest} 가 본다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialSalesPerStoreProcessorTest {

    private static final String PERIOD = "20261";
    private static final String COFFEE = "CS100010";
    private static final String DISTRICT = "11350";
    private static final String ADMINISTRATION = "11350600";
    private static final String COMMERCIAL = "3110438";

    @Mock
    private CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;

    @InjectMocks
    private CommercialSalesPerStoreProcessor processor;

    @Test
    @DisplayName("세 단위 점포를 매출 요약의 코드로 한 번씩만 읽고 업종 전체 점포 수로 나눈다")
    void readsEachUnitOnceWithTheSalesSummaryCodesAndUsesSimilarStoreCount() {
        when(commercialSummaryRepositoryPort.findStoreDistrict(PERIOD, DISTRICT, COFFEE))
            .thenReturn(Optional.of(StoreDistrict.builder().districtCode(DISTRICT).totalStoreCount(700L).similarStoreCount(809L).build()));
        when(commercialSummaryRepositoryPort.findStoreAdministration(PERIOD, ADMINISTRATION, COFFEE))
            .thenReturn(Optional.of(StoreAdministration.builder().administrationCode(ADMINISTRATION).totalStoreCount(90L).similarStoreCount(102L).build()));
        // 총 점포 수(프랜차이즈 제외)를 일부러 다르게 둬 분모가 업종 전체 점포 수인지 가른다(이슈 #490).
        when(commercialSummaryRepositoryPort.findStoreCommercial(PERIOD, COMMERCIAL, COFFEE))
            .thenReturn(Optional.of(StoreCommercial.builder().commercialCode(COMMERCIAL).totalStoreCount(10L).similarStoreCount(20L).build()));

        CommercialSalesPerStoreSummaryInfo info = processor.getSalesPerStore(PERIOD, COFFEE, salesSummary());

        assertThat(info.district().storeCount()).isEqualTo(809L);
        assertThat(info.administration().storeCount()).isEqualTo(102L);
        assertThat(info.commercial().storeCount()).isEqualTo(20L);
        assertThat(info.commercial().monthlySalesPerStore()).isEqualTo(8_248_228L);
        assertThat(info.indexVsDistrict()).isEqualTo(43.3);
        assertThat(info.indexVsAdministration()).isEqualTo(63.4);
        verify(commercialSummaryRepositoryPort).findStoreDistrict(PERIOD, DISTRICT, COFFEE);
        verify(commercialSummaryRepositoryPort).findStoreAdministration(PERIOD, ADMINISTRATION, COFFEE);
        verify(commercialSummaryRepositoryPort).findStoreCommercial(PERIOD, COMMERCIAL, COFFEE);
        // 매출은 다시 읽지 않는다 - 단위의 코드·이름·매출은 넘겨받은 요약에서 온다.
        verifyNoMoreInteractions(commercialSummaryRepositoryPort);
    }

    @Test
    @DisplayName("점포 행이 하나도 없어도 예외 없이 세 단위를 남기고 점포 수·점포당 매출·지수만 비운다")
    void missingStoreRowsDegradeToNullInsteadOfNotFound() {
        // 목은 Optional 반환에 빈 값을 돌려준다 - 세 단위 모두 점포 행이 없는 상황이다.
        CommercialSalesPerStoreSummaryInfo info = processor.getSalesPerStore(PERIOD, COFFEE, salesSummary());

        assertThat(info.district().code()).isEqualTo(DISTRICT);
        assertThat(info.district().monthlySalesAmount()).isEqualTo(15_415_802_889L);
        assertThat(info.district().storeCount()).isNull();
        assertThat(info.administration().storeCount()).isNull();
        assertThat(info.commercial().storeCount()).isNull();
        assertThat(info.commercial().monthlySalesPerStore()).isNull();
        assertThat(info.indexVsDistrict()).isNull();
        assertThat(info.indexVsAdministration()).isNull();
    }

    private static CommercialSalesSummaryInfo salesSummary() {
        return CommercialSalesSummaryInfo.builder()
            .periodCode(PERIOD)
            .district(RegionalSalesSummaryInfo.builder()
                .code(DISTRICT).name("노원구").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(15_415_802_889L).build())
            .administration(RegionalSalesSummaryInfo.builder()
                .code(ADMINISTRATION).name("공릉2동").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(1_326_394_061L).build())
            .commercial(RegionalSalesSummaryInfo.builder()
                .code(COMMERCIAL).name("경춘선숲길 우측").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(164_964_564L).build())
            .build();
    }
}
