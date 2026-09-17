package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;

/**
 * {@code dataset_fact} 활성 릴리스를 기존 팩트 테이블 컬럼으로 이관하는 요청.
 * {@code runId} 는 이 이관 Job 의 Spring Batch 식별자이지, 원본 facts 릴리스 run_id 가 아니다.
 */
public record ProjectionRequest(
    String runId,
    Dataset dataset,
    Quarter period,
    String spatialVersion,
    String schemaVersion,
    boolean dryRun
) {

    public ProjectionRequest {
        if (runId == null || !runId.matches("[a-zA-Z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Invalid runId");
        }
        if (dataset == null || period == null) {
            throw new IllegalArgumentException("dataset and period required");
        }
        // 팩트 테이블에 실제로 INSERT 하는 것은 이 Job 이다. 사실 적재만 막으면 이미 스테이징된
        // 중단 분기 릴리스를 재투영해 0 행이 다시 게시된다. 규칙 본문은 Dataset 이 갖는다.
        dataset.assertPublishable(period);
        if (spatialVersion == null || !spatialVersion.matches("[a-zA-Z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Invalid spatialVersion");
        }
        if (!"seoul-v1".equals(schemaVersion)) {
            throw new IllegalArgumentException("Unsupported schemaVersion; register a new source contract first");
        }
    }
}
