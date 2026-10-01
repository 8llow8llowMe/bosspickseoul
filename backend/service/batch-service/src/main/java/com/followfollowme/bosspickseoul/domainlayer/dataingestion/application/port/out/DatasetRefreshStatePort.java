package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.List;
import java.util.Map;

/** {@code dataset_refresh_state}. run 시작 시 한 번에 읽고, 데이터셋마다 판단이 끝나면 그 행만 쓴다. */
public interface DatasetRefreshStatePort {

    /** 행이 없는 데이터셋은 키가 없다. */
    Map<Dataset, DatasetRefreshState> findAll();

    void save(DatasetRefreshState state);

    /** 상태 테이블이 있는지. 앱이 만들지 않는 테이블이라 기동 가드가 켜기 전에 본다. */
    boolean tableExists();

    /** 어댑터가 읽고 쓰는 컬럼 가운데 테이블에 없는 것. 예전 DDL 로 만든 테이블이면 새 컬럼이 빠져 있다. */
    List<String> missingColumns();
}
