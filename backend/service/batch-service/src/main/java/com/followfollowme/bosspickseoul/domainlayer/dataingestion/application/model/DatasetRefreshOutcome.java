package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.List;

/** 데이터셋 1종의 판단 결과와 쓴 API 호출 수, 저장할 상태. */
public record DatasetRefreshOutcome(Dataset dataset, List<DatasetRefreshSlot> slots, int apiCalls, DatasetRefreshState state) {
    public DatasetRefreshOutcome {
        slots = List.copyOf(slots);
    }
}
