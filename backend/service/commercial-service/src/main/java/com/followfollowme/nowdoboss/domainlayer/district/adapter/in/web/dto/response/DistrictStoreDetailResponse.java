package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item.DistrictStoreServiceTopItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 점포 상세 응답")
public record DistrictStoreDetailResponse(
    @Schema(description = "점포 수 상위 8개 업종 목록")
    List<DistrictStoreServiceTopItem> topStoreServices
) {

}
