package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.AdministrationServiceStoreQueryResult;
import java.util.List;

/**
 * 블루오션 업종 산정용 행정동 업종별 점포 조회 포트.
 * 데이터 원천은 administration 컨텍스트의 store_administration 테이블이다.
 */
public interface AdministrationStoreQueryPort {

    List<AdministrationServiceStoreQueryResult> findAllByPeriodCodeAndAdministrationCode(
        String periodCode, String administrationCode);
}
