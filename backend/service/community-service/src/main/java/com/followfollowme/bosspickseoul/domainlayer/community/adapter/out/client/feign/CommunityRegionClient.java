package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.AdministrationAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.CommercialAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.DistrictAreaQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "${feign-client.target-services.district-service:district-service}",
    contextId = "communityRegionClient"
)
public interface CommunityRegionClient {

    @GetMapping("/api/v1/regions/districts/{districtCode}")
    Response<DistrictAreaQueryResult> getDistrict(@PathVariable String districtCode);

    @GetMapping("/api/v1/regions/administrations/{administrationCode}")
    Response<AdministrationAreaQueryResult> getAdministration(@PathVariable String administrationCode);

    @GetMapping("/api/v1/regions/commercials/{commercialCode}/administration")
    Response<CommercialAreaQueryResult> getCommercialAdministration(@PathVariable String commercialCode);
}
