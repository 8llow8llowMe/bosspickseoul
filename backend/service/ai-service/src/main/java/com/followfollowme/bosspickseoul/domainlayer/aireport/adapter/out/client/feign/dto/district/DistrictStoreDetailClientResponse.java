package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictStoreDetailClientResponse(
    List<DistrictStoreServiceTopClientResponse> topStoreServices,
    List<DistrictOpenedStoreAdministrationTopClientResponse> topOpenedAdministrations,
    List<DistrictClosedStoreAdministrationTopClientResponse> topClosedAdministrations
) {

}
