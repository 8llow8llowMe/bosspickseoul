package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import java.util.List;
import lombok.Builder;

@Builder
public record AdministrationStoreDetailQueryResult(
    List<AdministrationStoreServiceTopQueryResult> topStoreServices
) {

}
