package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.util.List;

/**
 * 원천이 돌려준 헤더·행과 원본 영수증. 파일이든 다른 전달 경로든 같은 모양이라 검증 규칙은 한 곳에만 있다.
 *
 * @param receipt 원본 바이트의 SHA-256, 보관 위치, 헤더를 뺀 행 수
 */
public record PensionIncomeSource(List<String> headers, List<PensionIncomeSourceRecord> records, SourceReceipt receipt) {

    public PensionIncomeSource {
        headers = List.copyOf(headers);
        records = List.copyOf(records);
    }
}
