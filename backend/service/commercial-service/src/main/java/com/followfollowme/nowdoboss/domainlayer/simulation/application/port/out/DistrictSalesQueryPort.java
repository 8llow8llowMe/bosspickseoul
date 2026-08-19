package com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query.DistrictServiceSalesQueryResult;
import java.util.List;
import java.util.Optional;

/**
 * 성별·연령/성수기 분석용 자치구 매출 조회 포트.
 * 데이터 원천은 district 컨텍스트의 sales_district 테이블이다.
 */
public interface DistrictSalesQueryPort {

    Optional<DistrictServiceSalesQueryResult> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode, String districtCode, String serviceCode);

    List<DistrictServiceSalesQueryResult> findAllByPeriodCodesAndDistrictCodeAndServiceCode(
        List<String> periodCodes, String districtCode, String serviceCode);
}
