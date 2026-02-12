package com.followfollowme.nowdoboss.domainlayer.district.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;

public interface DistrictWebUseCase {

    DistrictTopTenSummaryResponse getTopTenDistricts(String currentPeriodCode, String previousPeriodCode);
}
