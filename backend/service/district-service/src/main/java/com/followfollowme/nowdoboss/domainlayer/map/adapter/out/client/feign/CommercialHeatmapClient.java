package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "commercial-service",
    contextId = "commercialHeatmapClient"
)
public interface CommercialHeatmapClient {

    @GetMapping("/api/v1/commercials/heatmap")
    Response<CommercialHeatmapScoresQueryResult> getHeatmapScores(
        @RequestParam List<String> commercialCodes,
        @RequestParam String serviceCode,
        @RequestParam String metricType,
        @RequestParam String periodCode
    );

    @GetMapping("/api/v1/commercials/heatmap-composite")
    Response<CommercialHeatmapScoresQueryResult> getCompositeHeatmapScores(
        @RequestParam List<String> commercialCodes,
        @RequestParam String serviceCode,
        @RequestParam String preset,
        @RequestParam(required = false) String priorityMetric,
        @RequestParam String periodCode
    );
}
