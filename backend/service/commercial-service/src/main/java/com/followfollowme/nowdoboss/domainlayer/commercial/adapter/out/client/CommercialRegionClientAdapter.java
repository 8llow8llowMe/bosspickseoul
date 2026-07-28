package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client.feign.CommercialRegionClient;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialRegionClientAdapter implements CommercialRegionQueryPort {

    private final CommercialRegionClient commercialRegionClient;

    @Override
    public CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode) {
        Response<CommercialAdministrationQueryResult> response = commercialRegionClient.getCommercialAdministration(commercialCode);
        if (response == null || response.dataBody() == null) {
            throw new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND);
        }
        return response.dataBody();
    }
}
