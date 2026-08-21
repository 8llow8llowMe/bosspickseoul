package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationSizeItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "업종별 매장 크기 기준 응답 DTO")
public record SimulationStoreSizesResponse(

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "한식음식점")
    String serviceName,

    @Schema(description = "기준 데이터 연도", example = "2024")
    String dataBaseYear,

    @Schema(description = "소형 매장 크기")
    SimulationSizeItem small,

    @Schema(description = "중형 매장 크기")
    SimulationSizeItem medium,

    @Schema(description = "대형 매장 크기")
    SimulationSizeItem large
) {

}
