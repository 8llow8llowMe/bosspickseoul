package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "지역 단위 하나의 업종 점포당 월 매출. 점포 행이 없거나 점포 수가 0 이어도 단위는 남고 storeCount·monthlySalesPerStore 만 비운다")
public record RegionalSalesPerStoreItem(

    @Schema(description = "지역 코드(자치구·행정동·상권)", example = "3110438")
    String code,

    @Schema(description = "지역 이름", example = "경춘선숲길 우측")
    String name,

    @Schema(description = "이 업종의 월 매출 총액(원). salesSummary 의 같은 단위 값과 같다", example = "164964564")
    long monthlySalesAmount,

    @Schema(
        description = "이 업종 전체 점포 수(유사 업종 점포 수 = 일반 + 프랜차이즈). 프랜차이즈를 뺀 총 점포 수(STOR_CO)를 쓰지 않는다 — "
            + "월 매출은 업종 점포 전체의 매출이라 프랜차이즈를 빼면 점포당 매출이 부풀려진다(이슈 #490). 그 분기·업종의 점포 행이 없으면 null 이다",
        example = "20", nullable = true)
    Long storeCount,

    @Schema(description = "점포당 월 매출(원). 월 매출 ÷ storeCount 를 원 단위 반올림(HALF_UP)한 값. storeCount 가 null 이거나 0 이면 null 이다",
        example = "8248228", nullable = true)
    Long monthlySalesPerStore
) {

}
