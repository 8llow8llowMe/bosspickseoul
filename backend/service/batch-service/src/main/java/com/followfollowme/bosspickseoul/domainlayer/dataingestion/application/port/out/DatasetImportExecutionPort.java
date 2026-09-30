package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportExecution;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;

/**
 * 수동 CLI 가 띄우는 것과 같은 분기 적재 Job 을 띄운다. 검증·게시 규칙은 Job 안에 있고 자동 최신화가 다시 구현하지 않는다.
 * 실패는 예외가 아니라 {@link ImportExecution#completed()} = false 로 돌려준다.
 */
public interface DatasetImportExecutionPort {

    ImportExecution runFacts(ImportRequest request);

    ImportExecution runProjection(ProjectionRequest request);
}
