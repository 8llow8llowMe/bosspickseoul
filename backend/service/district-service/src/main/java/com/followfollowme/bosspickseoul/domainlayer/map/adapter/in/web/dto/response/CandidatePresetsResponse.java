package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CandidatePresetItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "후보 탐색 프리셋 응답")
public record CandidatePresetsResponse(

    @Schema(description = "프리셋 목록")
    List<CandidatePresetItem> presets
) {

}
