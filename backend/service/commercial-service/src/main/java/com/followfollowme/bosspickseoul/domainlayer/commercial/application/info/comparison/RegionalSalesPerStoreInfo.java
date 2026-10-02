package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.Builder;

/**
 * 상권 벤치마크에서 지역 단위 하나의 업종 점포당 월 매출(이슈 #485).
 *
 * <p>{@code code}·{@code name}·{@code monthlySalesAmount} 는 이미 읽은 매출 요약 leg 를 그대로 옮긴다 — 같은 행을 다시 읽지 않는다.
 * 점포 행이 없으면 {@code storeCount}·{@code monthlySalesPerStore} 를, 점포 수가 0 이면 {@code monthlySalesPerStore} 만 비우고 단위 자체는 남긴다.
 */
@Builder
public record RegionalSalesPerStoreInfo(
    String code,
    String name,
    long monthlySalesAmount,
    // 이 업종 전체 점포 수(유사 업종 점포 수 = 일반 + 프랜차이즈). 그 분기·업종의 점포 행이 없으면 null 이다.
    Long storeCount,
    // 월 매출 ÷ 점포 수를 원 단위 HALF_UP 으로 반올림한 값. 점포 수가 null 이거나 0 이면 null 이다.
    Long monthlySalesPerStore
) {

    public static RegionalSalesPerStoreInfo of(RegionalSalesSummaryInfo sales, Long storeCount) {
        return RegionalSalesPerStoreInfo.builder()
            .code(sales.code())
            .name(sales.name())
            .monthlySalesAmount(sales.monthlySalesAmount())
            .storeCount(storeCount)
            .monthlySalesPerStore(salesPerStore(sales.monthlySalesAmount(), storeCount))
            .build();
    }

    /** 0 으로 나누지 않고 값을 지어내지도 않는다. 점포가 없으면 점포당 매출은 정의되지 않는다. */
    private static Long salesPerStore(long monthlySalesAmount, Long storeCount) {
        if (storeCount == null || storeCount <= 0) {
            return null;
        }
        return BigDecimal.valueOf(monthlySalesAmount)
            .divide(BigDecimal.valueOf(storeCount), 0, RoundingMode.HALF_UP)
            .longValueExact();
    }
}
