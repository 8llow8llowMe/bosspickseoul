package com.followfollowme.bosspickseoul.domainlayer.district.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictSalesAdministrationDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import java.util.List;

public interface DistrictWebUseCase {

    DistrictTopTenSummaryResponse getTopTenDistricts(String currentPeriodCode, String previousPeriodCode);

    DistrictDetailResponse getDistrictDetail(String districtCode, String currentPeriodCode, String previousPeriodCode);

    FootTrafficDistrictDetailResponse getDistrictFootTrafficDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode);

    ChangeIndicatorDistrictResponse getDistrictChangeDetail(String districtCode, String currentPeriodCode);

    DistrictStoreDetailResponse getDistrictTotalStoreDetail(String districtCode, String currentPeriodCode);

    DistrictSalesDetailResponse getDistrictSalesTopFiveDetail(String districtCode, String currentPeriodCode, String previousPeriodCode);

    DistrictSalesAdministrationDetailResponse getDistrictSalesAdministrationTopFiveDetail(
        String districtCode,
        String currentPeriodCode,
        String previousPeriodCode
    );

    List<DistrictAreaResponse> getAllDistricts(String currentPeriodCode);
}
