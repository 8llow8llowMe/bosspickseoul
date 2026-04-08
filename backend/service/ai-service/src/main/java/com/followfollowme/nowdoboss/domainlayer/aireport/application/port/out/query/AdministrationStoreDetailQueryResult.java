package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record AdministrationStoreDetailQueryResult(
    List<AdministrationStoreServiceTopQueryResult> topStoreServices
) {

}
