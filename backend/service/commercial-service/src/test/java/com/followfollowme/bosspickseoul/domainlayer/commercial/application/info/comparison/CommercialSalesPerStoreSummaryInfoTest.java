package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * 점포당 평균 매출 지수 계산식을 못 박는다(이슈 #485).
 *
 * <p>기준 예시는 개발 DB 20261 커피-음료(CS100010)의 경춘선숲길 우측(3110438) / 공릉2동(11350600) / 노원구(11350)다. 점포 수는
 * 업종 전체(유사 업종 점포 수)를 쓴다 — 프랜차이즈를 뺀 총 점포 수를 쓰면 같은 예시의 상권 지수가 86.6 으로 부풀려진다(이슈 #490).
 */
class CommercialSalesPerStoreSummaryInfoTest {

    private static final String COFFEE = "CS100010";

    @Test
    @DisplayName("개발 DB 예시 값으로 자치구 대비 43.3, 행정동 대비 63.4 가 나온다")
    void reproducesTheDevDatabaseExample() {
        CommercialSalesPerStoreSummaryInfo info = CommercialSalesPerStoreSummaryInfo.of(
            salesSummary(15_415_802_889L, 1_326_394_061L, 164_964_564L), 809L, 102L, 20L);

        assertThat(info.serviceCode()).isEqualTo(COFFEE);
        assertThat(info.serviceName()).isEqualTo("커피-음료");
        assertThat(info.commercial().monthlySalesPerStore()).isEqualTo(8_248_228L);
        assertThat(info.administration().monthlySalesPerStore()).isEqualTo(13_003_863L);
        // 15,415,802,889 / 809 = 19,055,380.58 -> 반올림 19,055,381 (버림이 아니다).
        assertThat(info.district().monthlySalesPerStore()).isEqualTo(19_055_381L);
        assertThat(info.indexVsDistrict()).isEqualTo(43.3);
        assertThat(info.indexVsAdministration()).isEqualTo(63.4);
        // 단위의 코드·이름·매출은 매출 요약 leg 를 그대로 옮긴다.
        assertThat(info.district().code()).isEqualTo("11350");
        assertThat(info.district().name()).isEqualTo("노원구");
        assertThat(info.district().monthlySalesAmount()).isEqualTo(15_415_802_889L);
        assertThat(info.district().storeCount()).isEqualTo(809L);
        assertThat(info.commercial().code()).isEqualTo("3110438");
        assertThat(info.commercial().name()).isEqualTo("경춘선숲길 우측");
    }

    @ParameterizedTest(name = "{0} / {1} -> {2}")
    @CsvSource({
        "15, 2, 8",
        "14, 4, 4",
        "10, 3, 3",
        "0, 5, 0"
    })
    @DisplayName("점포당 매출은 원 단위 HALF_UP 으로 반올림한다")
    void salesPerStoreRoundsHalfUpToWon(long monthlySalesAmount, long storeCount, long expected) {
        assertThat(RegionalSalesPerStoreInfo.of(region("11350", monthlySalesAmount), storeCount).monthlySalesPerStore()).isEqualTo(expected);
    }

    @Test
    @DisplayName("점포 수가 0 이거나 점포 행이 없으면 점포당 매출만 null 이고 단위는 남는다")
    void zeroOrMissingStoreCountLeavesOnlyThePerStoreValueNull() {
        RegionalSalesPerStoreInfo zero = RegionalSalesPerStoreInfo.of(region("3110438", 164_964_564L), 0L);
        RegionalSalesPerStoreInfo missing = RegionalSalesPerStoreInfo.of(region("3110438", 164_964_564L), null);

        assertThat(zero.storeCount()).isZero();
        assertThat(zero.monthlySalesPerStore()).isNull();
        assertThat(missing.storeCount()).isNull();
        assertThat(missing.monthlySalesPerStore()).isNull();
        assertThat(missing.code()).isEqualTo("3110438");
        assertThat(missing.monthlySalesAmount()).isEqualTo(164_964_564L);
    }

    @Test
    @DisplayName("비교 단위의 점포 행이 없으면 그 지수만 null 이고 다른 지수는 계산한다")
    void missingDenominatorStoreRowNullsOnlyThatIndex() {
        CommercialSalesPerStoreSummaryInfo info = CommercialSalesPerStoreSummaryInfo.of(
            salesSummary(15_415_802_889L, 1_326_394_061L, 164_964_564L), null, 102L, 20L);

        assertThat(info.district()).isNotNull();
        assertThat(info.district().storeCount()).isNull();
        assertThat(info.district().monthlySalesPerStore()).isNull();
        assertThat(info.indexVsDistrict()).isNull();
        assertThat(info.indexVsAdministration()).isEqualTo(63.4);
    }

    @Test
    @DisplayName("비교 단위의 점포당 매출이 0 이면 0 으로 나누지 않고 지수를 null 로 둔다")
    void zeroDenominatorPerStoreNullsTheIndex() {
        CommercialSalesPerStoreSummaryInfo info = CommercialSalesPerStoreSummaryInfo.of(salesSummary(0L, 0L, 164_964_564L), 809L, 102L, 20L);

        assertThat(info.district().monthlySalesPerStore()).isZero();
        assertThat(info.administration().monthlySalesPerStore()).isZero();
        assertThat(info.indexVsDistrict()).isNull();
        assertThat(info.indexVsAdministration()).isNull();
    }

    @Test
    @DisplayName("상권 점포 수가 0 이면 두 지수 모두 0 이 아니라 null 이다")
    void zeroCommercialStoreCountNullsBothIndices() {
        CommercialSalesPerStoreSummaryInfo info = CommercialSalesPerStoreSummaryInfo.of(
            salesSummary(15_415_802_889L, 1_326_394_061L, 164_964_564L), 809L, 102L, 0L);

        assertThat(info.commercial().monthlySalesPerStore()).isNull();
        assertThat(info.indexVsDistrict()).isNull();
        assertThat(info.indexVsAdministration()).isNull();
    }

    @Test
    @DisplayName("상권 매출이 0 이고 비교 단위 값이 있으면 지수는 null 이 아니라 0.0 이다")
    void zeroCommercialSalesIsAValidZeroIndex() {
        CommercialSalesPerStoreSummaryInfo info = CommercialSalesPerStoreSummaryInfo.of(
            salesSummary(15_415_802_889L, 1_326_394_061L, 0L), 809L, 102L, 20L);

        assertThat(info.indexVsDistrict()).isEqualTo(0.0);
        assertThat(info.indexVsAdministration()).isEqualTo(0.0);
    }

    private static CommercialSalesSummaryInfo salesSummary(long districtSales, long administrationSales, long commercialSales) {
        return CommercialSalesSummaryInfo.builder()
            .periodCode("20261")
            .district(RegionalSalesSummaryInfo.builder()
                .code("11350").name("노원구").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(districtSales).build())
            .administration(RegionalSalesSummaryInfo.builder()
                .code("11350600").name("공릉2동").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(administrationSales).build())
            .commercial(RegionalSalesSummaryInfo.builder()
                .code("3110438").name("경춘선숲길 우측").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(commercialSales).build())
            .build();
    }

    private static RegionalSalesSummaryInfo region(String code, long monthlySalesAmount) {
        return RegionalSalesSummaryInfo.builder()
            .code(code).name("이름").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(monthlySalesAmount).build();
    }
}
