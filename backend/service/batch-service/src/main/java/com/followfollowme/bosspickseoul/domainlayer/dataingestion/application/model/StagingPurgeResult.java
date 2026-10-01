package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/**
 * 스테이징 정리 1회 결과.
 *
 * @param candidateRuns 잠금 없는 조회로 고른 run 수
 * @param abandonedRuns NEW / RUNNING 인 채 버려져 FAILED 로 표시한 run 수. 이들의 행은 미게시 행 수에 더한다
 * @param skippedRuns   고른 뒤 상태가 바뀌어(재실행 시작 등) 손대지 않은 버려진 run 수
 * @param lockConflictRuns 락 대기 초과·데드락으로 이번에 건너뛴 run 수. 다음 주 run 이 다시 고른다
 */
public record StagingPurgeResult(int candidateRuns, int abandonedRuns, int skippedRuns, int lockConflictRuns,
                                 long unpublishedStagingRows, long unpublishedRejectedRows, long supersededStagingRows) {
}
