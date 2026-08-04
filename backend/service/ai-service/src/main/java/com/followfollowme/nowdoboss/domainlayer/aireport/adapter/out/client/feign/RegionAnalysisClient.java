package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "${feign-client.target-services.district-service:district-service}",
    contextId = "regionAnalysisClient"
)
public interface RegionAnalysisClient {

    @GetMapping("/api/v1/regions/administrations/{administrationCode}")
    Response<AdministrationDistrictQueryResult> getAdministrationDistrict(@PathVariable String administrationCode);

    @GetMapping("/api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials")
    Response<List<AdministrationCommercialQueryResult>> getCommercialsByAdministration(
        @PathVariable String districtCode,
        @PathVariable String administrationCode
    );

    @GetMapping("/api/v1/regions/commercials/{commercialCode}/administration")
    Response<CommercialAdministrationQueryResult> getCommercialAdministration(@PathVariable String commercialCode);
}
