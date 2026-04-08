package com.followfollowme.nowdoboss.domainlayer.region.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.nowdoboss.domainlayer.region.domain.enums.RegionCodeType;
import java.util.List;

public interface RegionWebUseCase {

    List<AdministrationAreaResponse> getAdministrationsByDistrictCode(String districtCode);

    List<CommercialAreaResponse> getCommercialsByAdministrationCode(String districtCode, String administrationCode);

    RegionCodeLookupResponse lookupRegionCode(RegionCodeType type, String codeName);

    AdministrationDistrictAreaResponse getAdministrationDistrictByAdministrationCode(String administrationCode);

    CommercialAdministrationAreaResponse getCommercialAdministrationByCommercialCode(String commercialCode);
}
