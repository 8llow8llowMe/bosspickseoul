package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "${feign-client.target-services.commercial-service:commercial-service}",
    contextId = "commercialCandidateClient"
)
public interface CommercialCandidateClient {

    @GetMapping("/api/v1/commercials/candidates")
    Response<CandidateCommercialsQueryResult> getTopCandidates(
        @RequestParam List<String> commercialCodes,
        @RequestParam String serviceCode,
        @RequestParam String preset,
        @RequestParam(required = false) String priorityMetric,
        @RequestParam(required = false) Integer topN,
        @RequestParam String periodCode
    );
}
