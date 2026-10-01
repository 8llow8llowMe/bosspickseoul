package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.Map;
import java.util.SortedSet;

/**
 * 데이터셋별로 팩트 테이블에 적재된 분기를 읽는다.
 *
 * <p>정본은 commercial 스키마의 typed 팩트 테이블 15종이다. {@code dataset_active_release} 는 게시 상태라
 * 이관(project)이 끝나지 않은 분기를 담을 수 있어 정본으로 쓰지 않는다 — 조회 API 가 실제로 읽는 행이 있어야 한다.
 */
public interface AnalysisDatasetPeriodQueryPort {

    /**
     * 주어진 공간 스냅샷의 데이터셋별 적재 분기({@code YYYYQ}, 오름차순). {@link DatasetKey} 15종을 모두 키로 담고,
     * 행이 없는 데이터셋은 빈 집합이다.
     *
     * <p><b>실패 계약.</b> 저장소를 읽지 못하면 unchecked 예외를 던지고 부분 결과를 돌려주지 않는다 — 커넥션 획득·트랜잭션 시작 실패와
     * 질의 시간 초과를 포함한다(JPA 구현은 Spring 의 {@code DataAccessException}·{@code TransactionException}). 호출자는 유형을
     * 가리지 않고 {@link RuntimeException} 으로 다루면 된다. 블로킹 호출이고 구현이 질의 시간 상한을 둔다.
     */
    Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion);
}
