package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.CommercialHeatmapClient;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialHeatmapClientAdapter implements CommercialHeatmapQueryPort {

    private final CommercialHeatmapClient commercialHeatmapClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public CommercialHeatmapScoresQueryResult getHeatmapScores(List<String> commercialCodes, String serviceCode, String metricType, String periodCode) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialHeatmapClient.getHeatmapScores(commercialCodes, serviceCode, metricType, periodCode)
        );
    }

    @Override
    public CommercialHeatmapScoresQueryResult getCompositeHeatmapScores(
        List<String> commercialCodes, String serviceCode, String preset, String priorityMetric, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialHeatmapClient.getCompositeHeatmapScores(commercialCodes, serviceCode, preset, priorityMetric, periodCode)
        );
    }
}
