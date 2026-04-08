package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationDistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RegionPresenter {

    public AdministrationAreaResponse toAdministrationAreaResponse(AdministrationAreaInfo info) {
        return AdministrationAreaResponse.builder()
            .administrationCode(info.administrationCode())
            .administrationCodeName(info.administrationCodeName())
            .centerLat(info.centerLat())
            .centerLng(info.centerLng())
            .build();
    }

    public CommercialAreaResponse toCommercialAreaResponse(CommercialAreaInfo info) {
        return CommercialAreaResponse.builder()
            .commercialCode(info.commercialCode())
            .commercialCodeName(info.commercialCodeName())
            .commercialClassificationCode(info.commercialClassificationCode())
            .commercialClassificationCodeName(info.commercialClassificationCodeName())
            .centerLat(info.centerLat())
            .centerLng(info.centerLng())
            .build();
    }

    public List<AdministrationAreaResponse> toAdministrationAreaResponses(List<AdministrationAreaInfo> infos) {
        return infos.stream()
            .map(this::toAdministrationAreaResponse)
            .toList();
    }

    public List<CommercialAreaResponse> toCommercialAreaResponses(List<CommercialAreaInfo> infos) {
        return infos.stream()
            .map(this::toCommercialAreaResponse)
            .toList();
    }

    public RegionCodeLookupResponse toRegionCodeLookupResponse(RegionCodeLookupInfo info) {
        return RegionCodeLookupResponse.builder()
            .districtCode(info.districtCode())
            .districtCodeName(info.districtCodeName())
            .administrationCode(info.administrationCode())
            .administrationCodeName(info.administrationCodeName())
            .commercialCode(info.commercialCode())
            .commercialCodeName(info.commercialCodeName())
            .build();
    }

    public AdministrationDistrictAreaResponse toAdministrationDistrictAreaResponse(AdministrationDistrictAreaInfo info) {
        return AdministrationDistrictAreaResponse.builder()
            .districtCode(info.districtCode())
            .districtCodeName(info.districtCodeName())
            .administrationCode(info.administrationCode())
            .administrationCodeName(info.administrationCodeName())
            .build();
    }

    public CommercialAdministrationAreaResponse toCommercialAdministrationAreaResponse(CommercialAdministrationAreaInfo info) {
        return CommercialAdministrationAreaResponse.builder()
            .districtCode(info.districtCode())
            .districtCodeName(info.districtCodeName())
            .administrationCode(info.administrationCode())
            .administrationCodeName(info.administrationCodeName())
            .build();
    }
}
