package com.followfollowme.nowdoboss.domainlayer.district.application.service;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.area.DistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.in.DistrictWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import java.util.List;
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
        // 1. Top10 요약 조회
        DistrictTopTenSummaryInfo info = districtQueryProcessor.getTopTenSummary(currentPeriodCode, previousPeriodCode);
        // 2. Response 변환
        return districtPresenter.toDistrictTopTenSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictDetailResponse getDistrictDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        // 1. 구별 상세 조회
        DistrictDetailInfo info = districtQueryProcessor.getDistrictDetail(districtCode, currentPeriodCode, previousPeriodCode);
        // 2. Response 변환
        return districtPresenter.toDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public FootTrafficDistrictDetailResponse getDistrictFootTrafficDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        // 1. 유동인구 상세 조회
        DistrictFootTrafficDetailInfo info = districtQueryProcessor.getDistrictFootTrafficDetail(districtCode, currentPeriodCode, previousPeriodCode);
        // 2. Response 변환
        return districtPresenter.toFootTrafficDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public ChangeIndicatorDistrictResponse getDistrictChangeDetail(String districtCode, String currentPeriodCode) {
        // 1. 변화지표 조회
        DistrictChangeIndicatorInfo info = districtQueryProcessor.getDistrictChangeDetail(districtCode, currentPeriodCode);
        // 2. Response 변환
        return districtPresenter.toChangeIndicatorDistrictResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictStoreDetailResponse getDistrictTotalStoreDetail(String districtCode, String currentPeriodCode) {
        // 1. 점포 상세 조회
        DistrictStoreDetailInfo info = districtQueryProcessor.getDistrictTotalStoreDetail(districtCode, currentPeriodCode);
        // 2. Response 변환
        return districtPresenter.toDistrictStoreDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictSalesDetailResponse getDistrictSalesTopFiveDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        // 1. 매출 Top5 조회
        DistrictSalesDetailInfo info = districtQueryProcessor.getDistrictSalesTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        // 2. Response 변환
        return districtPresenter.toDistrictSalesDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistrictAreaResponse> getAllDistricts(String currentPeriodCode) {
        // 1. 자치구 목록 조회
        List<DistrictAreaInfo> infos = districtQueryProcessor.getAllDistricts(currentPeriodCode);
        // 2. Response 목록 변환
        return districtPresenter.toDistrictAreaResponses(infos);
    }
}

