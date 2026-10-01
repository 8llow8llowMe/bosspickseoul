package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import java.time.LocalDate;
import java.util.Optional;

public interface DistrictPensionIncomeRepositoryPort {

    /** 기준일이 {@code referenceDate} 이하인 자치구 평균 중 가장 최근 것. 그 이전 자료가 없으면 비어 있다. */
    Optional<PensionIncomeDistrict> findLatestByDistrictCodeOnOrBefore(String districtCode, LocalDate referenceDate);
}
