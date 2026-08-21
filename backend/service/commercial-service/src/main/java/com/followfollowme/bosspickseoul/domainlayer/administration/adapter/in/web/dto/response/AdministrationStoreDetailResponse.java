package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item.AdministrationStoreServiceTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "행정동 점포 상세 응답")
public record AdministrationStoreDetailResponse(
    @Schema(description = "점포 상위 업종 목록")
    List<AdministrationStoreServiceTopItem> topStoreServices
) {

}
