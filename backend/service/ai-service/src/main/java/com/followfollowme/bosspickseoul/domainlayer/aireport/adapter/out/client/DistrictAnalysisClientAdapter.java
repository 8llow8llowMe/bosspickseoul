package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.DistrictAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DistrictAnalysisClientAdapter implements DistrictAnalysisQueryPort {

    private final DistrictAnalysisClient districtAnalysisClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public DistrictDetailQueryResult getDistrictDetail(String districtCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> districtAnalysisClient.getDistrictDetail(districtCode, periodCode));
    }
}
