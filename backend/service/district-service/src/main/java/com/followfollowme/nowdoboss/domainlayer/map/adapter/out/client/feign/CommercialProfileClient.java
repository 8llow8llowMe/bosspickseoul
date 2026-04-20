package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "commercial-service",
    contextId = "commercialProfileClient"
)
public interface CommercialProfileClient {

    @GetMapping("/api/v1/commercials/{commercialCode}/profile")
    Response<CommercialProfileQueryResult> getCommercialProfile(
        @PathVariable("commercialCode") String commercialCode,
        @RequestParam String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/api/v1/commercials/compare-preview")
    Response<CommercialComparePreviewQueryResult> getCommercialComparePreview(
        @RequestParam String leftCommercialCode,
        @RequestParam String rightCommercialCode,
        @RequestParam String serviceCode,
        @RequestParam String periodCode
    );
}
