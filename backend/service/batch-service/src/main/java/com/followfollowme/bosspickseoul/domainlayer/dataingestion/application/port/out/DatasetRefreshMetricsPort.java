package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.time.Instant;

/** 자동 최신화 메트릭. 레지스트리가 없으면 아무것도 하지 않는다(로그는 호출자가 남긴다). */
public interface DatasetRefreshMetricsPort {

    void apiCalls(int calls);

    void slot(Dataset dataset, DatasetRefreshResult result);

    void serviceTypeUnresolved(Dataset dataset, long rows);

    /** run 이 끝까지 돌았다. 마지막 정상 run 시각을 갱신하고 {@code outcome=finished} 로 센다. */
    void runFinished(Instant finishedAt);

    /** run 이 예외로 끊겼다(JVM 오류, 공간·상태 테이블 조회·저장 실패). 마지막 정상 run 시각은 그대로 두고 {@code outcome=aborted} 로 센다. */
    void runAborted();
}
