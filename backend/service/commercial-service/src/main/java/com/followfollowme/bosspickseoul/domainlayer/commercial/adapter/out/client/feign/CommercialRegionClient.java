package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "${feign-client.target-services.district-service:district-service}",
    contextId = "commercialRegionClient"
)
public interface CommercialRegionClient {

    @GetMapping("/api/v1/regions/commercials/{commercialCode}/administration")
    Response<CommercialAdministrationQueryResult> getCommercialAdministration(@PathVariable String commercialCode);
}
