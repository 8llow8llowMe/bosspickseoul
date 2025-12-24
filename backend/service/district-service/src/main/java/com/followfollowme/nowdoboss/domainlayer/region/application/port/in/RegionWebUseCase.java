package com.followfollowme.nowdoboss.domainlayer.region.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import java.util.List;

public interface RegionWebUseCase {

    List<AdministrationAreaResponse> getAdministrationsByDistrictCode(String districtCode);

    List<CommercialAreaResponse> getCommercialsByAdministrationCode(String administrationCode);
}
