package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialCandidateClient;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialCandidateClientAdapter implements CommercialCandidateQueryPort {

    private final CommercialCandidateClient commercialCandidateClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public CandidateCommercialsQueryResult getTopCandidates(
        List<String> commercialCodes, String serviceCode, String preset, String priorityMetric, Integer topN, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialCandidateClient.getTopCandidates(commercialCodes, serviceCode, preset, priorityMetric, topN, periodCode)
        );
    }
}
