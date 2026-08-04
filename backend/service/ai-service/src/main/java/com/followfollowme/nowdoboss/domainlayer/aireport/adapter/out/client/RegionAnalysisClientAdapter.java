package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign.RegionAnalysisClient;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RegionAnalysisClientAdapter implements RegionAnalysisQueryPort {

    private final RegionAnalysisClient regionAnalysisClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public AdministrationDistrictQueryResult getAdministrationDistrict(String administrationCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.DISTRICT_SERVICE, () -> regionAnalysisClient.getAdministrationDistrict(administrationCode));
    }

    @Override
    public List<AdministrationCommercialQueryResult> getCommercialsByAdministration(String administrationCode) {
        String districtCode = extractDistrictCode(administrationCode);
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> regionAnalysisClient.getCommercialsByAdministration(districtCode, administrationCode)
        );
    }

    @Override
    public CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.DISTRICT_SERVICE, () -> regionAnalysisClient.getCommercialAdministration(commercialCode));
    }

    private String extractDistrictCode(String administrationCode) {
        if (Objects.isNull(administrationCode) || administrationCode.length() < 5) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }
        return administrationCode.substring(0, 5);
    }
}
