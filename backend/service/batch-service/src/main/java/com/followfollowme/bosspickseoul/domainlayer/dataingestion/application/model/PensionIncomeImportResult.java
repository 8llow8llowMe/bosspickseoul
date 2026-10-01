package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.LocalDate;
import java.util.List;

/**
 * @param seoulRows           채택한 서울 행 수. 게시했다면 쓴 행 수와 같다
 * @param ignoredNonSeoulRows 타 시도라 무시한 행 수
 * @param published           실제로 테이블을 교체했는지. dry-run 이면 false
 */
public record PensionIncomeImportResult(SourceReceipt receipt, List<LocalDate> referenceDates, int seoulRows,
                                        int ignoredNonSeoulRows, boolean published) {

    public PensionIncomeImportResult {
        referenceDates = List.copyOf(referenceDates);
    }
}
