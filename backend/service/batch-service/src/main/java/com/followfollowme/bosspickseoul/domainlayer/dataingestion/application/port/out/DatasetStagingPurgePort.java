package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import java.time.Instant;

/** 분기 적재 스테이징 정리. 활성 릴리스가 가리키는 run 은 어떤 메서드도 지우지 않는다. 반환값은 지운 행 수다. */
public interface DatasetStagingPurgePort {

    long deleteUnpublishedStaging(Instant acquiredBefore, int chunkSize);

    long deleteUnpublishedRejectedRows(Instant acquiredBefore, int chunkSize);

    long deleteSupersededPublishedStaging(Instant publishedBefore, int chunkSize);
}
