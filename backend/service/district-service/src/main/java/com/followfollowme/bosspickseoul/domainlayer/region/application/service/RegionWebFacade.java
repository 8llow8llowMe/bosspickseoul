package com.followfollowme.bosspickseoul.domainlayer.region.application.service;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.presenter.RegionPresenter;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.AdministrationDistrictAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.CommercialAdministrationAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.DistrictAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.in.RegionWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.region.application.service.processor.RegionQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.enums.RegionCodeType;
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
    public RegionCodeLookupResponse lookupRegionCode(RegionCodeType type, String name) {
        RegionCodeLookupInfo info = regionQueryProcessor.lookupRegionCode(type, name);
        return regionPresenter.toRegionCodeLookupResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public AdministrationDistrictAreaResponse getAdministrationDistrictByAdministrationCode(String administrationCode) {
        AdministrationDistrictAreaInfo info = regionQueryProcessor.getAdministrationDistrictByAdministrationCode(administrationCode);
        return regionPresenter.toAdministrationDistrictAreaResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialAdministrationAreaResponse getCommercialAdministrationByCommercialCode(String commercialCode) {
        CommercialAdministrationAreaInfo info = regionQueryProcessor.getCommercialAdministrationByCommercialCode(commercialCode);
        return regionPresenter.toCommercialAdministrationAreaResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictAreaResponse getDistrictByDistrictCode(String districtCode) {
        DistrictAreaInfo info = regionQueryProcessor.getDistrictByDistrictCode(districtCode);
        return regionPresenter.toDistrictAreaResponse(info);
    }
}
