package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "시간대별 유동인구 상세 항목 DTO")
public record DistrictTimeSlotFootTrafficItem(
    @Schema(description = "00~06시 유동인구", example = "15000")
    long footTrafficTime00To06,

    @Schema(description = "06~11시 유동인구", example = "42000")
    long footTrafficTime06To11,

    @Schema(description = "11~14시 유동인구", example = "65000")
    long footTrafficTime11To14,

    @Schema(description = "14~17시 유동인구", example = "50000")
    long footTrafficTime14To17,

    @Schema(description = "17~21시 유동인구", example = "70000")
    long footTrafficTime17To21,

    @Schema(description = "21~24시 유동인구", example = "38000")
    long footTrafficTime21To24,

    @Schema(description = "우세 시간대 메타데이터")
    CodeNameDescriptionMetadata dominantTimeSlotType
) {

}
