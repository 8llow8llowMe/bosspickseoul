package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response.AnalysisPeriodsResponse;

public interface AnalysisPeriodWebUseCase {

    AnalysisPeriodsResponse getAnalysisPeriods();
}
