package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface TypedFactProjectionPort {

    Optional<String> activeRunId(ProjectionRequest request);

    List<FactRow> facts(String releaseRunId);

    int replaceChangeCommercial(ProjectionRequest request, List<ChangeCommercialTypedRow> rows);

    int replaceTyped(ProjectionRequest request, List<Object[]> rows);

    /**
     * 기존 팩트 테이블에 이관된 행 수를 분기별로. 게시 건수({@code accepted_count})와 다르면 이관이 안 됐거나 어긋난 슬롯이다
     * ({@code quarterly-import-coverage.sql} 5절과 같은 판정). 행이 없는 분기는 키가 없다.
     */
    Map<Quarter, Long> typedRowCounts(Dataset dataset, String spatialVersion);
}
