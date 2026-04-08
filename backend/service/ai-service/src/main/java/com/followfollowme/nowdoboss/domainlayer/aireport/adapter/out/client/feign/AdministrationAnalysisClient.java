package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "commercial-service",
    contextId = "administrationAnalysisClient",
    path = "/api/v1/administrations"
)
public interface AdministrationAnalysisClient {

    @GetMapping("/{administrationCode}")
    Response<AdministrationDetailQueryResult> getAdministrationDetail(
        @PathVariable String administrationCode,
        @RequestParam(name = "currentPeriodCode") String periodCode
    );
}
