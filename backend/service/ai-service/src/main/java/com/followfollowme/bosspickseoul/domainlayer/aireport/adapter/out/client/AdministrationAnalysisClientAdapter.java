package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.AdministrationAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationAnalysisClientAdapter implements AdministrationAnalysisQueryPort {

    private final AdministrationAnalysisClient administrationAnalysisClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> administrationAnalysisClient.getAdministrationDetail(administrationCode, periodCode));
    }
}
