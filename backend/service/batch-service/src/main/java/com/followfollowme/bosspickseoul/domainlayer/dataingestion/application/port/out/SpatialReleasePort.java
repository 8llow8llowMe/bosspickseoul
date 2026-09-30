package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;

public interface SpatialReleasePort {
    /** Returns false if an identical immutable snapshot is already ready. */
    boolean publish(SpatialSnapshot snapshot);

    /** 공간 스냅샷이 READY 인지. 아니면 그 버전으로 적재한 모든 행이 unmapped 로 거부된다. */
    boolean isReady(String spatialVersion);
}
