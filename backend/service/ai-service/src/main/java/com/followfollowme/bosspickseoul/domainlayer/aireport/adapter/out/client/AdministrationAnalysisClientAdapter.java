package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.AdministrationAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration.AdministrationAnalysisWireMapper;
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

    /*
     * peer 응답을 wire DTO(adapter/out/client/feign/dto/administration)로 받아 QueryResult 로 옮긴다.
     * peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, out-port 계약은 QueryResult 로만 표현된다.
     */

    @Override
    public AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode) {
        return AdministrationAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> administrationAnalysisClient.getAdministrationDetail(administrationCode, periodCode)
        ));
    }
}
