package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import java.time.Instant;

/** 분기 적재 자동 최신화 1회. Quartz 트리거가 부른다. */
public interface DatasetRefreshUseCase {

    DatasetRefreshSummary refresh(Instant firedAt);
}
