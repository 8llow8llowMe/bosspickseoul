package com.followfollowme.nowdoboss.domainlayer.district.application.info.store;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictStoreDetailInfo(
    List<DistrictStoreServiceTopInfo> topStoreServices
) {

}

