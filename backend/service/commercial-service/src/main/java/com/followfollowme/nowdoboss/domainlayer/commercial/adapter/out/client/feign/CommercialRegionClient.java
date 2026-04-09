package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "district-service",
    contextId = "commercialRegionClient"
)
public interface CommercialRegionClient {

    @GetMapping("/api/v1/regions/commercials/{commercialCode}/administration")
    Response<CommercialAdministrationQueryResult> getCommercialAdministration(@PathVariable String commercialCode);
}
