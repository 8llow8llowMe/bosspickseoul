package com.followfollowme.nowdoboss.domainlayer.administration.application.service;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.presenter.AdministrationPresenter;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.port.in.AdministrationWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.administration.application.service.processor.AdministrationQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdministrationWebFacade implements AdministrationWebUseCase {

    private final AdministrationQueryProcessor administrationQueryProcessor;
    private final AdministrationPresenter administrationPresenter;
    private final AnalysisViewEventPort analysisViewEventPort;

    @Override
    public AdministrationDetailResponse getAdministrationDetail(
        String administrationCode, String currentPeriodCode, String previousPeriodCode
    ) {
        AdministrationDetailInfo info = administrationQueryProcessor.getAdministrationDetail(
            administrationCode, currentPeriodCode, previousPeriodCode);
        // 인기 순위 집계용 이벤트. 포트 계약상 절대 예외를 던지지 않아 본 조회 응답에는 영향이 없다.
        analysisViewEventPort.publish(new AnalysisViewEvent(
            AnalysisAreaType.ADMINISTRATION, administrationCode, info.administrationName(), LocalDateTime.now()));
        return administrationPresenter.toAdministrationDetailResponse(info);
    }
}
