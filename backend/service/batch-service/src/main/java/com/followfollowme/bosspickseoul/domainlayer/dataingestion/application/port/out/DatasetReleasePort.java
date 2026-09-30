package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.List;

public interface DatasetReleasePort {
    void begin(ImportRequest request);
    void stage(ImportRequest request, List<FactRow> rows);
    void reject(ImportRequest request, SourceRow row, String reason);
    ValidationResult validate(ImportRequest request, SourceReceipt receipt);
    void complete(ImportRequest request, SourceReceipt receipt, ValidationResult result);
    void fail(ImportRequest request, String reason);

    /**
     * 한 데이터셋의 게시 슬롯 전부를 분기 오름차순으로. 마지막 원소가 최신 게시 분기이고, 직전 분기 행 수 기준선도 여기서 읽는다.
     * 슬롯마다 따로 조회하지 않도록 한 번에 돌려준다.
     */
    List<PublishedSlot> publishedSlots(Dataset dataset, String spatialVersion, String schemaVersion);
}
