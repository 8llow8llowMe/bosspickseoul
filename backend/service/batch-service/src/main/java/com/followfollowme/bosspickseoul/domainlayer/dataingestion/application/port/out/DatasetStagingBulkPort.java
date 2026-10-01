package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate;
import java.time.Instant;
import java.util.List;

/**
 * 분기 적재 스테이징 정리(대량 삭제). 활성 릴리스가 가리키는 run 은 어떤 메서드도 지우지 않는다. 삭제 반환값은 지운 행 수다.
 * {@code dataset_release} · {@code dataset_fact} · {@code dataset_active_release} 는 지우지 않는다(버려진 run 의 상태 표시만 한다).
 */
public interface DatasetStagingBulkPort {

    /** 잠금 없는 조회로 후보 run 을 고른다. 활성 포인터가 가리키는 run 은 빠진다. */
    List<StagingPurgeCandidate> findPurgeCandidates(Instant unpublishedBefore, Instant publishedBefore, Instant abandonedBefore);

    /**
     * NEW / RUNNING 인 채 {@code abandonedBefore} 전에 시작한 run 을 FAILED 로 표시한다.
     *
     * @return 표시했으면 true. 그 사이 끝났거나 다시 시작해 조건이 바뀌었으면 false 이고, 그 run 은 지우지 않는다
     */
    boolean markAbandoned(String runId, Instant abandonedBefore, String reason);

    long deleteStaging(StagingPurgeCandidate candidate, int chunkSize);

    long deleteRejectedRows(StagingPurgeCandidate candidate, int chunkSize);
}
