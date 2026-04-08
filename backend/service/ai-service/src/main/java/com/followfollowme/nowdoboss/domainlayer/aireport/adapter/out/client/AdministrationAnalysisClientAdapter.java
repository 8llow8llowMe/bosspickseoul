package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign.AdministrationAnalysisClient;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationAnalysisClientAdapter implements AdministrationAnalysisQueryPort {

    private final AdministrationAnalysisClient administrationAnalysisClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode) {
        return responseSupport.requestAndUnwrap(() -> administrationAnalysisClient.getAdministrationDetail(administrationCode, periodCode));
    }
}
