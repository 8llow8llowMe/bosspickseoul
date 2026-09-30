package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.time.Instant;

/** 자동 최신화 메트릭. 레지스트리가 없으면 아무것도 하지 않는다(로그는 호출자가 남긴다). */
public interface DatasetRefreshMetricsPort {

    void apiCalls(int calls);

    void slot(Dataset dataset, DatasetRefreshResult result);

    void serviceTypeUnresolved(Dataset dataset, long rows);

    void runFinished(Instant finishedAt);
}
