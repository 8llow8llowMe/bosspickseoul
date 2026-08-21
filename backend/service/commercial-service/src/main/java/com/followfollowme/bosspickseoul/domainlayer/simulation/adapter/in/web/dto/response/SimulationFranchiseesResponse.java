package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationFranchiseeSearchItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "프랜차이즈 검색 응답 DTO (커서 페이징, 최대 10건)")
public record SimulationFranchiseesResponse(

    @Schema(description = "프랜차이즈 목록 (id 오름차순)")
    List<SimulationFranchiseeSearchItem> franchisees,

    @Schema(description = "다음 페이지 커서 (마지막 항목의 franchiseeId, 결과가 없으면 null)", nullable = true)
    Long lastId
) {

}
