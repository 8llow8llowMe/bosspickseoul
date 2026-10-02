package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 폐업 점포 전체 순위 항목")
public record DistrictClosedStoreRankingItem(

    @Schema(description = "순위. 값이 같으면 같은 순위이고 다음 순위는 그만큼 건너뛴다(1, 2, 2, 4)", example = "1")
    int rank,

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "폐업 점포 수", example = "872")
    long closedStoreCount,

    @Schema(description = "전분기 대비 폐업률 증감률 (%). 비교 분기 값이 없거나 0 이면 null", example = "-2.3", nullable = true)
    Double closureChangeRate
) {

}
