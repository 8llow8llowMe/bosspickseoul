package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response.AnalysisPeriodsResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.presenter.AnalysisPeriodPresenter;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.in.AnalysisPeriodWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalysisPeriodWebFacade implements AnalysisPeriodWebUseCase {

    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;
    private final AnalysisPeriodPresenter analysisPeriodPresenter;

    /**
     * 트랜잭션을 걸지 않는다. 카탈로그는 인스턴스 메모리에서만 나오고(재계산은 스케줄러) DB 를 치지 않는다.
     * 여기서 트랜잭션을 열면 쓰지도 않을 커넥션을 잡고, DB 장애 때 트랜잭션 시작에서 실패해 마지막 성공값을 내려줄 수 없다.
     */
    @Override
    public AnalysisPeriodsResponse getAnalysisPeriods() {
        return analysisPeriodPresenter.toAnalysisPeriodsResponse(analysisPeriodCatalogProcessor.catalog());
    }
}
