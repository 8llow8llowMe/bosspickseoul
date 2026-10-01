package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.PensionIncomeDistrictEntity;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/**
 * 배치가 적재하는 읽기 전용 테이블이라 {@code JpaRepository} 대신 {@link Repository} 를 상속해 save·delete 를 열지 않는다.
 * (이슈 #415)
 */
public interface PensionIncomeDistrictRepository extends Repository<PensionIncomeDistrictEntity, Long> {

    /**
     * 기준일이 {@code referenceDate} 이하인 행 중 가장 최근 한 행. 원천이 연 1회(12월 기준) 스냅샷이라 요청 분기와 1:1 로
     * 맞지 않으므로 「그 시점에 이미 나와 있던 최신 자료」를 고른다. 런북 유니크 키 {@code (district_code, reference_date)} 를
     * 그대로 탄다.
     */
    Optional<PensionIncomeDistrictEntity> findFirstByDistrictCodeAndReferenceDateLessThanEqualOrderByReferenceDateDesc(
        String districtCode, LocalDate referenceDate);
}
