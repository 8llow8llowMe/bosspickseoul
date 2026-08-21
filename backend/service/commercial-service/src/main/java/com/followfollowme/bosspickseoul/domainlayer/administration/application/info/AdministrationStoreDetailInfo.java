package com.followfollowme.bosspickseoul.domainlayer.administration.application.info;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.item.AdministrationStoreServiceTopInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record AdministrationStoreDetailInfo(
    List<AdministrationStoreServiceTopInfo> topStoreServices
) {

}
