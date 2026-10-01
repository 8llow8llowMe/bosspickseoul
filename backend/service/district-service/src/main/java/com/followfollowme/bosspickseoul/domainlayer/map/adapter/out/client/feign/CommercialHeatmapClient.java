package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "${feign-client.target-services.commercial-service:commercial-service}",
    contextId = "commercialHeatmapClient"
)
public interface CommercialHeatmapClient {

    @GetMapping("/api/v1/commercials/heatmap")
    Response<CommercialHeatmapScoresQueryResult> getHeatmapScores(
        @RequestParam List<String> commercialCodes,
        @RequestParam String serviceCode,
        @RequestParam String metricType,
        // null 이면 Feign 이 쿼리에서 뺀다. commercial-service 가 적재 기준 기본 분기로 해석한다(이슈 #464).
        @RequestParam(required = false) String periodCode
    );

    @GetMapping("/api/v1/commercials/heatmap-composite")
    Response<CommercialHeatmapScoresQueryResult> getCompositeHeatmapScores(
        @RequestParam List<String> commercialCodes,
        @RequestParam String serviceCode,
        @RequestParam String preset,
        @RequestParam(required = false) String priorityMetric,
        // null 이면 Feign 이 쿼리에서 뺀다. commercial-service 가 적재 기준 기본 분기로 해석한다(이슈 #464).
        @RequestParam(required = false) String periodCode
    );
}
