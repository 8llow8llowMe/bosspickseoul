package com.followfollowme.nowdoboss.domainlayer.district.application.service;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictTopTenSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.in.DistrictWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DistrictFacade implements DistrictWebUseCase {

    private final DistrictQueryProcessor districtQueryProcessor;
    private final DistrictPresenter districtPresenter;

    @Override
    @Transactional(readOnly = true)
    public DistrictTopTenSummaryResponse getTopTenDistricts(String currentPeriodCode, String previousPeriodCode) {
        DistrictTopTenSummaryInfo info = districtQueryProcessor.getTopTenSummary(currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictTopTenSummaryResponse(info);
    }
}
