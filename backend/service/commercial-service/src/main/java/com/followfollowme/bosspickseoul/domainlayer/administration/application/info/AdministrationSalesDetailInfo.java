package com.followfollowme.bosspickseoul.domainlayer.administration.application.info;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.item.AdministrationSalesServiceTopInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record AdministrationSalesDetailInfo(
    List<AdministrationSalesServiceTopInfo> topSalesServices
) {

}
