package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.Builder;

/**
 * 상권 벤치마크의 업종별 점포당 평균 매출 지수(이슈 #485). 벤치마크 전용이다 — {@code /summaries/sales} 와 ai-service 가 공유하는
 * {@link CommercialSalesSummaryInfo} 에는 필드를 더하지 않는다.
 *
 * <p>지수는 상권 점포당 매출 ÷ 비교 단위 점포당 매출 × 100 이다. 100 이면 비교 단위 평균과 같다. 분자·분모가 응답에 실리는 원 단위
 * 점포당 매출이라 화면 숫자로 다시 계산해도 같은 값이 나온다. 소수 첫째 자리 HALF_UP 이고, 어느 한쪽이 없거나 분모가 0 이면 0 으로
 * 내리지 않고 null 이다.
 *
 * <p>점포 수는 {@code totalStoreCount}(STOR_CO, 프랜차이즈 제외)가 아니라 이 업종 전체({@code similarStoreCount}, 일반 + 프랜차이즈)다.
 * 월 매출은 그 업종 점포 전체의 매출이라 분모도 전체 점포여야 한다. 프랜차이즈를 뺀 점포 수로 나누면 프랜차이즈 비중이 큰 단위일수록
 * 점포당 매출이 부풀려진다(이슈 #490).
 */
@Builder
public record CommercialSalesPerStoreSummaryInfo(
    String serviceCode,
    String serviceName,
    RegionalSalesPerStoreInfo district,
    RegionalSalesPerStoreInfo administration,
    RegionalSalesPerStoreInfo commercial,
    Double indexVsDistrict,
    Double indexVsAdministration
) {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int INDEX_SCALE = 1;

    public static CommercialSalesPerStoreSummaryInfo of(
        CommercialSalesSummaryInfo salesSummary, Long districtStoreCount, Long administrationStoreCount, Long commercialStoreCount
    ) {
        RegionalSalesPerStoreInfo district = RegionalSalesPerStoreInfo.of(salesSummary.district(), districtStoreCount);
        RegionalSalesPerStoreInfo administration = RegionalSalesPerStoreInfo.of(salesSummary.administration(), administrationStoreCount);
        RegionalSalesPerStoreInfo commercial = RegionalSalesPerStoreInfo.of(salesSummary.commercial(), commercialStoreCount);

        return CommercialSalesPerStoreSummaryInfo.builder()
            .serviceCode(salesSummary.commercial().serviceCode())
            .serviceName(salesSummary.commercial().serviceName())
            .district(district)
            .administration(administration)
            .commercial(commercial)
            .indexVsDistrict(index(commercial.monthlySalesPerStore(), district.monthlySalesPerStore()))
            .indexVsAdministration(index(commercial.monthlySalesPerStore(), administration.monthlySalesPerStore()))
            .build();
    }

    /** 곱한 뒤 한 번만 나눠 반올림한다. 비율을 먼저 반올림하면 소수 첫째 자리가 흔들린다. */
    private static Double index(Long numerator, Long denominator) {
        if (numerator == null || denominator == null || denominator == 0) {
            return null;
        }
        return BigDecimal.valueOf(numerator)
            .multiply(HUNDRED)
            .divide(BigDecimal.valueOf(denominator), INDEX_SCALE, RoundingMode.HALF_UP)
            .doubleValue();
    }
}
