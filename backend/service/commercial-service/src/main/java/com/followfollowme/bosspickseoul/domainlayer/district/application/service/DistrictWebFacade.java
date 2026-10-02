package com.followfollowme.bosspickseoul.domainlayer.district.application.service;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor.AnalysisViewPublishProcessor;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictRankingSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictSalesAdministrationDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.presenter.DistrictPresenter;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.area.DistrictAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesAdministrationDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary.DistrictRankingSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.in.DistrictWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.district.application.service.processor.DistrictQueryProcessor;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분기 종속 유스케이스는 첫 줄에서 {@code currentPeriodCode} 를 {@link AnalysisPeriodCatalogProcessor#resolve(String)} 로 해석한다
 * (이슈 #464). 비교 분기({@code previousPeriodCode})는 Processor 가 해석된 현재 분기 기준으로 {@code PeriodCodeCalculator} 가 정한다.
 */
@Service
@RequiredArgsConstructor
public class DistrictWebFacade implements DistrictWebUseCase {

    private final DistrictQueryProcessor districtQueryProcessor;
    private final DistrictPresenter districtPresenter;
    private final AnalysisViewPublishProcessor analysisViewPublishProcessor;
    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Override
    @Transactional(readOnly = true)
    public DistrictTopTenSummaryResponse getTopTenDistricts(String currentPeriodCode, String previousPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictTopTenSummaryInfo info = districtQueryProcessor.getTopTenSummary(currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictTopTenSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictRankingSummaryResponse getDistrictRankings(String currentPeriodCode, String previousPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictRankingSummaryInfo info = districtQueryProcessor.getRankingSummary(currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictRankingSummaryResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictDetailResponse getDistrictDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictDetailInfo info = districtQueryProcessor.getDistrictDetail(districtCode, currentPeriodCode, previousPeriodCode);
        // 인기 순위 집계용 이벤트. 포트 계약상 절대 예외를 던지지 않아 본 조회 응답에는 영향이 없다.
        analysisViewPublishProcessor.publishView(
            AnalysisAreaType.DISTRICT, districtCode, info.districtName());
        return districtPresenter.toDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public FootTrafficDistrictDetailResponse getDistrictFootTrafficDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictFootTrafficDetailInfo info =
            districtQueryProcessor.getDistrictFootTrafficDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toFootTrafficDistrictDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public ChangeIndicatorDistrictResponse getDistrictChangeDetail(String districtCode, String currentPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictChangeIndicatorInfo info = districtQueryProcessor.getDistrictChangeDetail(districtCode, currentPeriodCode);
        return districtPresenter.toChangeIndicatorDistrictResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictStoreDetailResponse getDistrictTotalStoreDetail(String districtCode, String currentPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictStoreDetailInfo info = districtQueryProcessor.getDistrictTotalStoreDetail(districtCode, currentPeriodCode);
        return districtPresenter.toDistrictStoreDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictSalesDetailResponse getDistrictSalesTopFiveDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictSalesDetailInfo info =
            districtQueryProcessor.getDistrictSalesTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictSalesDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictSalesAdministrationDetailResponse getDistrictSalesAdministrationTopFiveDetail(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        DistrictSalesAdministrationDetailInfo info =
            districtQueryProcessor.getDistrictSalesAdministrationTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return districtPresenter.toDistrictSalesAdministrationDetailResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistrictAreaResponse> getAllDistricts(String currentPeriodCode) {
        currentPeriodCode = analysisPeriodCatalogProcessor.resolve(currentPeriodCode);
        List<DistrictAreaInfo> infos = districtQueryProcessor.getAllDistricts(currentPeriodCode);
        return districtPresenter.toDistrictAreaResponses(infos);
    }
}
