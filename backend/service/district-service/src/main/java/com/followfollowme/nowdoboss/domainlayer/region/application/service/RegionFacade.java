package com.followfollowme.nowdoboss.domainlayer.region.application.service;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.presenter.RegionPresenter;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.in.RegionWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.region.application.service.processor.RegionQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.region.domain.enums.RegionCodeType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RegionFacade implements RegionWebUseCase {

    private final RegionQueryProcessor regionQueryProcessor;
    private final RegionPresenter regionPresenter;

    @Override
    @Transactional(readOnly = true)
    public List<AdministrationAreaResponse> getAdministrationsByDistrictCode(String districtCode) {
        List<AdministrationAreaInfo> administrations = regionQueryProcessor.getAdministrationsByDistrictCode(districtCode);
        return regionPresenter.toAdministrationAreaResponses(administrations);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommercialAreaResponse> getCommercialsByAdministrationCode(String administrationCode) {
        List<CommercialAreaInfo> commercialAreaInfos = regionQueryProcessor.getCommercialsByAdministrationCode(administrationCode);
        return regionPresenter.toCommercialAreaResponses(commercialAreaInfos);
    }

    @Override
    @Transactional(readOnly = true)
    public RegionCodeLookupResponse getRegionCodeLookup(RegionCodeType type, String codeName) {
        RegionCodeLookupInfo info = regionQueryProcessor.getRegionCodeLookup(type, codeName);
        return regionPresenter.toRegionCodeLookupResponse(info);
    }


}
