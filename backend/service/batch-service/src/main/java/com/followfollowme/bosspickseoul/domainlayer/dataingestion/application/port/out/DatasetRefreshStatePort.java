package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.Map;

/** {@code dataset_refresh_state}. run 시작 시 한 번에 읽고, 데이터셋마다 판단이 끝나면 그 행만 쓴다. */
public interface DatasetRefreshStatePort {

    /** 행이 없는 데이터셋은 키가 없다. */
    Map<Dataset, DatasetRefreshState> findAll();

    void save(DatasetRefreshState state);
}
