package com.followfollowme.nowdoboss.domainlayer.district.application.service;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.time.LocalDateTime;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesAdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.area.DistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.in.DistrictWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DistrictWebFacade implements DistrictWebUseCase {

    private final DistrictQueryProcessor districtQueryProcessor;
    private final DistrictPresenter districtPresenter;
    private final AnalysisViewEventPort analysisViewEventPort;

    @Override
    @Transactional(readOnly = true)
    public DistrictTopTenSummaryResponse getTopTenDistricts(String currentPeriodCode, String previousPeriodCode) {
        DistrictTopTenSummaryInfo info = districtQueryProcessor.getTopTenSummary(currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictTopTenSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictDetailResponse getDistrictDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        DistrictDetailInfo info = districtQueryProcessor.getDistrictDetail(districtCode, currentPeriodCode, previousPeriodCode);
        // 인기 순위 집계용 이벤트. 포트 계약상 절대 예외를 던지지 않아 본 조회 응답에는 영향이 없다.
        analysisViewEventPort.publish(new AnalysisViewEvent(
            AnalysisAreaType.DISTRICT, districtCode, info.districtName(), LocalDateTime.now()));
        return districtPresenter.toDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public FootTrafficDistrictDetailResponse getDistrictFootTrafficDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        DistrictFootTrafficDetailInfo info =
            districtQueryProcessor.getDistrictFootTrafficDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toFootTrafficDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public ChangeIndicatorDistrictResponse getDistrictChangeDetail(String districtCode, String currentPeriodCode) {
        DistrictChangeIndicatorInfo info = districtQueryProcessor.getDistrictChangeDetail(districtCode, currentPeriodCode);
        return districtPresenter.toChangeIndicatorDistrictResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictStoreDetailResponse getDistrictTotalStoreDetail(String districtCode, String currentPeriodCode) {
        DistrictStoreDetailInfo info = districtQueryProcessor.getDistrictTotalStoreDetail(districtCode, currentPeriodCode);
        return districtPresenter.toDistrictStoreDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictSalesDetailResponse getDistrictSalesTopFiveDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        DistrictSalesDetailInfo info =
            districtQueryProcessor.getDistrictSalesTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictSalesDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictSalesAdministrationDetailResponse getDistrictSalesAdministrationTopFiveDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        List<DistrictSalesAdministrationTopInfo> infos =
            districtQueryProcessor.getDistrictSalesAdministrationTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictSalesAdministrationDetailResponse(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistrictAreaResponse> getAllDistricts(String currentPeriodCode) {
        List<DistrictAreaInfo> infos = districtQueryProcessor.getAllDistricts(currentPeriodCode);
        return districtPresenter.toDistrictAreaResponses(infos);
    }
}
