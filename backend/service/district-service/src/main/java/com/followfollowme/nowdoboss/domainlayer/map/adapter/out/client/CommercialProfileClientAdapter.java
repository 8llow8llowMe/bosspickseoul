package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialProfileClient;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialProfileClientAdapter implements CommercialProfileQueryPort {

    private final CommercialProfileClient commercialProfileClient;

    @Override
    public CommercialProfileQueryResult getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        Response<CommercialProfileQueryResult> response =
            commercialProfileClient.getCommercialProfile(commercialCode, serviceCode, periodCode);
        return response == null ? null : response.dataBody();
    }

    @Override
    public CommercialComparePreviewQueryResult getCommercialComparePreview(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        Response<CommercialComparePreviewQueryResult> response =
            commercialProfileClient.getCommercialComparePreview(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
        return response == null ? null : response.dataBody();
    }
}
