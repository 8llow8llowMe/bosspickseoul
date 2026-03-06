package com.followfollowme.nowdoboss.domainlayer.region.application.service;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.presenter.RegionPresenter;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAdministrationAreaInfo;
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
public class RegionWebFacade implements RegionWebUseCase {

    private final RegionQueryProcessor regionQueryProcessor;
    private final RegionPresenter regionPresenter;

    @Override
    @Transactional(readOnly = true)
    public List<AdministrationAreaResponse> getAdministrationsByDistrictCode(String districtCode) {
        List<AdministrationAreaInfo> infos = regionQueryProcessor.getAdministrationsByDistrictCode(districtCode);
        return regionPresenter.toAdministrationAreaResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommercialAreaResponse> getCommercialsByAdministrationCode(String districtCode, String administrationCode) {
        List<CommercialAreaInfo> infos = regionQueryProcessor.getCommercialsByAdministrationCode(districtCode, administrationCode);
        return regionPresenter.toCommercialAreaResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public RegionCodeLookupResponse lookupRegionCode(RegionCodeType type, String codeName) {
        RegionCodeLookupInfo info = regionQueryProcessor.lookupRegionCode(type, codeName);
        return regionPresenter.toRegionCodeLookupResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialAdministrationAreaResponse getCommercialAdministrationByCommercialCode(String commercialCode) {
        CommercialAdministrationAreaInfo info = regionQueryProcessor.getCommercialAdministrationByCommercialCode(commercialCode);
        return regionPresenter.toCommercialAdministrationAreaResponse(info);
    }

}
