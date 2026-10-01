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
     * 트랜잭션을 걸지 않는다. 카탈로그는 인스턴스 메모리에서 나오고, 재계산 질의는 어댑터가 자기 트랜잭션을 연다.
     * 여기서 트랜잭션을 열면 DB 장애 때 트랜잭션 시작에서 바로 실패해 마지막 성공값(stale)을 내려줄 기회가 사라진다.
     */
    @Override
    public AnalysisPeriodsResponse getAnalysisPeriods() {
        return analysisPeriodPresenter.toAnalysisPeriodsResponse(analysisPeriodCatalogProcessor.catalog());
    }
}
