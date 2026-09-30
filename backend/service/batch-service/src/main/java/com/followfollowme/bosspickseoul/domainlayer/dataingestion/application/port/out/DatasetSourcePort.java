package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceAcquisition;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.util.Optional;

public interface DatasetSourcePort {
    SourceSession open(ImportRequest request);

    /** API 1회로 원천 합계 행 수를 본다. 비어 있으면 그 분기 데이터가 아직 없다. */
    Optional<Long> probe(Dataset dataset, Quarter period);

    /** 요청 분기의 전 페이지를 보관하고 분기별 행 수를 센다. 게시 기록을 남기지 않는다. */
    SourceAcquisition acquire(Dataset dataset, Quarter urlPeriod, String runId);

    interface SourceSession extends AutoCloseable {
        SourceRow read();
        SourceReceipt receipt();
        @Override void close();
    }
}
