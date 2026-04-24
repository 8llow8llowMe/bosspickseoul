package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialHeatmapClient;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialHeatmapClientAdapter implements CommercialHeatmapQueryPort {

    private final CommercialHeatmapClient commercialHeatmapClient;

    @Override
    public CommercialHeatmapScoresQueryResult getHeatmapScores(List<String> commercialCodes, String serviceCode, String metricType, String periodCode) {
        Response<CommercialHeatmapScoresQueryResult> response =
            commercialHeatmapClient.getHeatmapScores(commercialCodes, serviceCode, metricType, periodCode);
        return response == null ? null : response.dataBody();
    }

    @Override
    public CommercialHeatmapScoresQueryResult getCompositeHeatmapScores(
        List<String> commercialCodes, String serviceCode, String preset, String priorityMetric, String periodCode
    ) {
        Response<CommercialHeatmapScoresQueryResult> response =
            commercialHeatmapClient.getCompositeHeatmapScores(commercialCodes, serviceCode, preset, priorityMetric, periodCode);
        return response == null ? null : response.dataBody();
    }
}
