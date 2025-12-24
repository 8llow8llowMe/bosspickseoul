package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAreaInfo;
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
}
