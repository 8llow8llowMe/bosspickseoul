package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.RegionAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration.AdministrationAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAreaQueryResult;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RegionAnalysisClientAdapter implements RegionAnalysisQueryPort {

    private final RegionAnalysisClient regionAnalysisClient;
    private final InternalResponseSupport responseSupport;

    /*
     * 아래 2개는 peer 응답을 wire DTO(adapter/out/client/feign/dto/administration)로 받아 QueryResult 로 옮긴다.
     * peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, out-port 계약은 QueryResult 로만 표현된다.
     * 나머지 메서드는 아직 wire 분리 전이라 QueryResult 를 Feign 반환 타입으로 그대로 쓴다(이슈 #389 범위 밖, #387 소관).
     */

    @Override
    public AdministrationDistrictQueryResult getAdministrationDistrict(String administrationCode) {
        return AdministrationAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> regionAnalysisClient.getAdministrationDistrict(administrationCode)
        ));
    }

    @Override
    public List<AdministrationCommercialQueryResult> getCommercialsByAdministration(String administrationCode) {
        String districtCode = extractDistrictCode(administrationCode);
        return AdministrationAnalysisWireMapper.toCommercialQueryResults(responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> regionAnalysisClient.getCommercialsByAdministration(districtCode, administrationCode)
        ));
    }

    @Override
    public CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.DISTRICT_SERVICE, () -> regionAnalysisClient.getCommercialAdministration(commercialCode));
    }

    @Override
    public DistrictAreaQueryResult getDistrict(String districtCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.DISTRICT_SERVICE, () -> regionAnalysisClient.getDistrict(districtCode));
    }

    private String extractDistrictCode(String administrationCode) {
        if (Objects.isNull(administrationCode) || administrationCode.length() < 5) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }
        return administrationCode.substring(0, 5);
    }
}
