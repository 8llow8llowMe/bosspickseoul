package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

/**
 * 지역명 조회의 DISTINCT 적용 범위를 실제 스키마에 질의해 고정한다.
 *
 * <p>{@code GET /regions/code-lookup} 의 계약은 "이름이 유일하면 1건, 동명이 있으면 다건({@code REGION_006})"
 * 이다. 이 계약은 <b>closed 투영이 SELECT 한 컬럼 조합에만 DISTINCT 가 걸린다</b>는 Spring Data 내부 동작에
 * 전적으로 기대고 있다. 투영 인터페이스에 {@code @Value} 가 하나라도 붙어 open projection 이 되는 순간
 * SELECT 가 엔티티 전체로 넓어지고, 그러면 {@code district_name = '종로구'} 가 자치구당 상권 수(약 60~70행)
 * 만큼 다건이 되어 정상 조회가 전 건 {@code REGION_006}(400) 으로 죽는다.
 *
 * <p>컴파일로도, 포트를 mock 한 {@code RegionQueryProcessorTest} 로도 이 경계는 검증되지 않는다.
 * 실제 SQL 이 어떤 컬럼을 SELECT 하는지에 달려 있어서다. 그래서 여기서 실제 스키마에 질의해 고정한다.
 */
@DataJpaTest
class CommercialRegionMappingRepositoryTest {

    @Autowired
    private CommercialRegionMappingRepository commercialRegionMappingRepository;

    @BeforeEach
    void setUp() {
        commercialRegionMappingRepository.deleteAll();
    }

    @Test
    @DisplayName("같은 자치구의 상권이 여러 행이어도 자치구명 조회는 1행으로 접힌다")
    void districtNameLookupCollapsesRowsOfSameDistrict() {
        save("11110", "종로구", "1111051500", "청운효자동", "3110001", "광화문역");
        save("11110", "종로구", "1111053000", "사직동", "3110002", "경복궁역");
        save("11110", "종로구", "1111054000", "삼청동", "3110003", "안국역");

        List<DistrictNameProjection> found = commercialRegionMappingRepository.findDistinctByDistrictName("종로구");

        // 투영이 open projection 이 되면 여기서 3행이 되고, 운영에서는 자치구당 60~70행이 된다.
        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getDistrictCode()).isEqualTo("11110");
        assertThat(found.getFirst().getDistrictName()).isEqualTo("종로구");
    }

    @Test
    @DisplayName("자치구가 다른 동명 행정동은 접히지 않고 다건으로 올라온다")
    void administrationNameLookupKeepsHomonymsInDifferentDistricts() {
        // 같은 '역삼동' 이라도 자치구가 다르면 district_code 가 달라 DISTINCT 에 접히지 않는다.
        // 이 다건이 REGION_006(같은 이름의 지역이 여러 곳) 응답의 근거다.
        save("11680", "강남구", "1168064000", "역삼동", "3110004", "역삼역");
        save("11740", "강동구", "1174064000", "역삼동", "3110005", "강동역");
        // 같은 행정동 안의 상권이 여러 개여도 그것만으로는 다건이 되지 않는다.
        save("11680", "강남구", "1168064000", "역삼동", "3110006", "선릉역");

        List<AdministrationNameProjection> found =
            commercialRegionMappingRepository.findDistinctByAdministrationName("역삼동");

        assertThat(found).hasSize(2);
        assertThat(found).extracting(AdministrationNameProjection::getDistrictCode)
            .containsExactlyInAnyOrder("11680", "11740");
    }

    @Test
    @DisplayName("상권 코드가 다른 동명 상권은 접히지 않고 다건으로 올라온다")
    void commercialNameLookupKeepsHomonymsWithDifferentCodes() {
        save("11680", "강남구", "1168064000", "역삼동", "3110007", "먹자골목");
        save("11110", "종로구", "1111051500", "청운효자동", "3110008", "먹자골목");

        List<CommercialNameProjection> found = commercialRegionMappingRepository.findDistinctByCommercialName("먹자골목");

        assertThat(found).hasSize(2);
        assertThat(found).extracting(CommercialNameProjection::getCommercialCode)
            .containsExactlyInAnyOrder("3110007", "3110008");
    }

    private void save(
        String districtCode, String districtName,
        String administrationCode, String administrationName,
        String commercialCode, String commercialName
    ) {
        commercialRegionMappingRepository.save(CommercialRegionMappingEntity.builder()
            .commercialClassificationCode("A")
            .commercialClassificationName("골목상권")
            .commercialCode(commercialCode)
            .commercialName(commercialName)
            .x(200000.0)
            .y(450000.0)
            .districtCode(districtCode)
            .districtName(districtName)
            .administrationCode(administrationCode)
            .administrationName(administrationName)
            .build());
    }
}
