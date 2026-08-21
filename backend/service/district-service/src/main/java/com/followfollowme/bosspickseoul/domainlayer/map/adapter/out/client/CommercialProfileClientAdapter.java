package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.CommercialProfileClient;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialProfileClientAdapter implements CommercialProfileQueryPort {

    private final CommercialProfileClient commercialProfileClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public CommercialProfileQueryResult getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialProfileClient.getCommercialProfile(commercialCode, serviceCode, periodCode)
        );
    }

    @Override
    public CommercialComparePreviewQueryResult getCommercialComparePreview(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialProfileClient.getCommercialComparePreview(leftCommercialCode, rightCommercialCode, serviceCode, periodCode)
        );
    }
}
