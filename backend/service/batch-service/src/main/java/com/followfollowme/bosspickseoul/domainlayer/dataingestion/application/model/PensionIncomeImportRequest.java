package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.nio.charset.Charset;
import java.nio.file.Path;
import java.time.Instant;

/**
 * 국민연금 자치구 평균소득 파일 적재 요청(이슈 #415). 분기 적재({@link ImportRequest})와 달리 데이터셋·분기가 없다. 원천이 연 1회
 * 스냅샷이고, 기준일은 파일 안의 기준년월에서 나온다.
 *
 * @param spatialVersion 자치구 이름 → 코드 대조에 쓸 공간 스냅샷. READY 여야 한다
 * @param expectedRows   파일 안 서울 행 수(25구 × 기준년월 수). 타 시도 행은 세지 않는다
 * @param dryRun         검증만 하고 쓰지 않는다. 기본값은 호출자가 true 로 준다
 */
public record PensionIncomeImportRequest(String runId, Path sourceFile, String charset, String spatialVersion,
                                         long expectedRows, Instant sourceUpdatedAt, boolean dryRun) {

    public PensionIncomeImportRequest {
        if (runId == null || !runId.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid runId");
        if (sourceFile == null) throw new IllegalArgumentException("sourceFile required");
        if (charset == null || !Charset.isSupported(charset)) throw new IllegalArgumentException("Unsupported charset");
        if (spatialVersion == null || !spatialVersion.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid spatialVersion");
        if (expectedRows < 1) throw new IllegalArgumentException("expectedRows must be the verified Seoul row count of this file");
        if (sourceUpdatedAt == null) throw new IllegalArgumentException("sourceUpdatedAt required");
    }
}
