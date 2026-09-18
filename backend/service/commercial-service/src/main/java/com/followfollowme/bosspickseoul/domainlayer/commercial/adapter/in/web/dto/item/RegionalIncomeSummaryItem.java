package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "지역 단위 하나의 지출 요약")
public record RegionalIncomeSummaryItem(

    @Schema(description = "지역 코드. 상권 leg 는 행정동 값으로 대체하더라도 상권 코드를 유지한다", example = "3110971")
    String code,

    @Schema(
        description = "지역 이름. 상권 leg 는 그 분기에 상권 소비 행 자체가 없는 대체 구간에서 null 이다 — "
            + "소비 요약 응답 어디에도 상권명이 없어 채울 근거가 없다. 화면은 이 경우 코드나 화면이 이미 아는 상권명을 쓴다",
        example = "선정릉역 4번 출구", nullable = true)
    String name,

    @Schema(description = "총 지출액(원). 세부 항목이 적재된 행은 항목합이다", example = "550")
    long totalExpenseAmount
) {

}
