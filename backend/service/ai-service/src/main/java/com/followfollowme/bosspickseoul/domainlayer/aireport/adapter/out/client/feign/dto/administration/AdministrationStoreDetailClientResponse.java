package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AdministrationStoreDetailClientResponse(
    List<AdministrationStoreServiceTopClientResponse> topStoreServices
) {

}
