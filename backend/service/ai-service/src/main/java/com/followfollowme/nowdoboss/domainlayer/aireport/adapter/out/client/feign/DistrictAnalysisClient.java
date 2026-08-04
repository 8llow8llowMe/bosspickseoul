package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "${feign-client.target-services.commercial-service:commercial-service}",
    contextId = "districtAnalysisClient",
    path = "/api/v1/districts"
)
public interface DistrictAnalysisClient {

    @GetMapping("/{districtCode}")
    Response<DistrictDetailQueryResult> getDistrictDetail(
        @PathVariable String districtCode,
        @RequestParam(name = "currentPeriodCode") String periodCode
    );
}
