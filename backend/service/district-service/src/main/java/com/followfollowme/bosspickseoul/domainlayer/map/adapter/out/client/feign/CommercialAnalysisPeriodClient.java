package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.dto.AnalysisPeriodsClientResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(
    name = "${feign-client.target-services.commercial-service:commercial-service}",
    contextId = "commercialAnalysisPeriodClient"
)
public interface CommercialAnalysisPeriodClient {

    /** 적재 데이터 기준 분석 분기 카탈로그(이슈 #464). 분기를 생략한 지도 요청의 기본 분기를 여기서 받는다. */
    @GetMapping("/api/v1/commercials/periods")
    Response<AnalysisPeriodsClientResponse> getAnalysisPeriods();
}
