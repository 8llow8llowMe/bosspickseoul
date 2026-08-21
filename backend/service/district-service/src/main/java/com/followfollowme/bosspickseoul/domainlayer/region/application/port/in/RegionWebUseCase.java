package com.followfollowme.bosspickseoul.domainlayer.region.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.enums.RegionCodeType;
import java.util.List;

public interface RegionWebUseCase {

    List<AdministrationAreaResponse> getAdministrationsByDistrictCode(String districtCode);

    List<CommercialAreaResponse> getCommercialsByAdministrationCode(String districtCode, String administrationCode);

    RegionCodeLookupResponse lookupRegionCode(RegionCodeType type, String name);

    AdministrationDistrictAreaResponse getAdministrationDistrictByAdministrationCode(String administrationCode);

    CommercialAdministrationAreaResponse getCommercialAdministrationByCommercialCode(String commercialCode);

    DistrictAreaResponse getDistrictByDistrictCode(String districtCode);
}
