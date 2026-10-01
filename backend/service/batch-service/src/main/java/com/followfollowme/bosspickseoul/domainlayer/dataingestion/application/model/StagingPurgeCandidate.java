package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/**
 * 스테이징을 지울 run 하나. 후보는 활성 릴리스가 가리키지 않는 run 뿐이다. 지우기 직전에 어댑터가 상태와 활성 여부를 다시 본다.
 *
 * @param kind 어느 보존 규칙으로 골랐는지. 지울 테이블과 삭제 시점에 다시 확인할 상태가 이것으로 정해진다
 */
public record StagingPurgeCandidate(String runId, Kind kind) {

    public StagingPurgeCandidate {
        if (runId == null || runId.isBlank() || kind == null) {
            throw new IllegalArgumentException("runId and kind required");
        }
    }

    public enum Kind {
        /** DRY_RUN / FAILED 가 미게시 보존 기간을 넘겼다. 스테이징과 거부 행을 지운다. */
        UNPUBLISHED,
        /** 교체된 PUBLISHED 가 게시 보존 기간을 넘겼다. 스테이징만 지운다(게시 run 은 거부 행이 0 이다). */
        SUPERSEDED,
        /** NEW / RUNNING 인 채 버려졌다. FAILED 로 표시한 뒤 스테이징과 거부 행을 지운다. */
        ABANDONED
    }
}
