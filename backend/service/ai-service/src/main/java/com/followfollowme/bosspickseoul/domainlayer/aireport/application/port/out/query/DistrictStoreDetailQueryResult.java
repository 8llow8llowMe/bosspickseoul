package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictStoreDetailQueryResult(
    List<DistrictStoreServiceTopQueryResult> topStoreServices,
    List<DistrictOpenedStoreAdministrationTopQueryResult> topOpenedAdministrations,
    List<DistrictClosedStoreAdministrationTopQueryResult> topClosedAdministrations
) {

}

