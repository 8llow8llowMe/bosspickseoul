package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSnapshot;

/** {@code pension_income_district} 쓰기. 원천이 연 1회 스냅샷이라 기준일 단위로 통째로 바꾼다. */
public interface PensionIncomeDistrictBulkPort {

    /**
     * 스냅샷에 든 기준일의 기존 행을 지우고 새 행을 넣는다. 한 트랜잭션이라 중간 상태가 읽히지 않는다.
     * 스냅샷에 없는 기준일(이전 파일에만 있던 해)은 건드리지 않는다.
     *
     * @return 넣은 행 수
     */
    int replace(PensionIncomeSnapshot snapshot);
}
