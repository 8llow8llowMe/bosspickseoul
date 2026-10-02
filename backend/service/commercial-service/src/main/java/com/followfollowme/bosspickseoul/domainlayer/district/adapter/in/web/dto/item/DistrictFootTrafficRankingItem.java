package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 유동인구 전체 순위 항목")
public record DistrictFootTrafficRankingItem(

    @Schema(description = "순위. 값이 같으면 같은 순위이고 다음 순위는 그만큼 건너뛴다(1, 2, 2, 4)", example = "1")
    int rank,

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "총 유동인구 수", example = "5847230")
    long totalFootTraffic,

    @Schema(description = "전분기 대비 유동인구 증감률 (%). 비교 분기 값이 없거나 0 이면 null", example = "12.5", nullable = true)
    Double footTrafficChangeRate
) {

}
