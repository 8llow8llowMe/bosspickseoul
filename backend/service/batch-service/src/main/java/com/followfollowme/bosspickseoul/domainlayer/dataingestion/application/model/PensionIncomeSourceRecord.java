package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.util.List;

/**
 * 원천 한 행의 값을 해석하지 않은 그대로 담는다. 필드 수·형식 검증은 {@code PensionIncomeImportProcessor} 가 한다.
 *
 * @param rowNumber 헤더를 뺀 1부터의 행 번호. 위반 보고에 쓴다
 */
public record PensionIncomeSourceRecord(long rowNumber, List<String> values) {

    public PensionIncomeSourceRecord {
        values = List.copyOf(values);
    }
}
