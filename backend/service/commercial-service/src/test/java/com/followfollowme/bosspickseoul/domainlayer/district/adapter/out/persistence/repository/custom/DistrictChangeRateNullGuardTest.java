package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

/**
 * 자치구 변화율 계산이 이전 분기 데이터가 없을 때도 터지지 않는지 못 박는다.
 *
 * <p>변화율 projection 필드는 primitive {@code double} 이다. 이전 분기 합계를 구하는 상관
 * 서브쿼리가 0 행이면 SUM 이 NULL 이고, 나눗셈 결과도 NULL 이 된다. QueryDSL 의
 * {@code ConstructorExpression} 은 primitive 파라미터에 null 을 넣으려다
 * {@code argument type mismatch} 를 리포지터리 밖으로 그대로 던진다.
 *
 * <p>이 경로는 클라이언트가 직접 유발할 수 있다. {@code previousPeriodCode} 는 요청 파라미터이고
 * (`DistrictWebController`), 검증은 {@code ^\d{4}[1-4]$} 형식만 본다. 존재하지 않는 분기를 넣으면
 * 자치구 Top10 API 전체가 500 이 된다.
 *
 * <p>같은 저장소의 행정동 쪽({@code SalesAdministrationRepositoryAdapter})은 {@code coalesce} 와
 * {@code CaseBuilder} 로 이미 막고 있다. 자치구 쪽에만 그 가드가 빠져 있었다.
 */
@DataJpaTest
class DistrictChangeRateNullGuardTest {

    private static final String SPATIAL_VERSION = DatasetSpatialVersion.DEFAULT;
    private static final String CURRENT_PERIOD = "20233";
    private static final String MISSING_PERIOD = "19991";
    private static final String GANGNAM = "11680";

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private SalesDistrictRepository salesDistrictRepository;

    @Autowired
    private StoreDistrictRepository storeDistrictRepository;

    @BeforeEach
    void setUp() {
        entityManager.getEntityManager()
            .createQuery("delete from SalesDistrictEntity").executeUpdate();
        entityManager.getEntityManager()
            .createQuery("delete from StoreDistrictEntity").executeUpdate();
    }

    @Test
    @DisplayName("매출: 이전 분기 데이터가 없어도 터지지 않고 변화율 0 으로 내려간다")
    void salesSurvivesMissingPreviousPeriod() {
        entityManager.persist(salesEntity(CURRENT_PERIOD, 1_000L));
        entityManager.flush();

        List<SalesDistrictTopTenProjection> result = salesDistrictRepository
            .findTopTenBySales(CURRENT_PERIOD, MISSING_PERIOD);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).salesChangeRate()).isZero();
        assertThat(result.get(0).totalSalesAmount()).isEqualTo(1_000L);
    }

    @Test
    @DisplayName("매출: 이전 분기 합계가 0 이어도 0 으로 나누지 않는다")
    void salesSurvivesZeroPreviousSum() {
        entityManager.persist(salesEntity(CURRENT_PERIOD, 1_000L));
        entityManager.persist(salesEntity(MISSING_PERIOD, 0L));
        entityManager.flush();

        List<SalesDistrictTopTenProjection> result = salesDistrictRepository
            .findTopTenBySales(CURRENT_PERIOD, MISSING_PERIOD);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).salesChangeRate()).isZero();
    }

    @Test
    @DisplayName("점포: 이전 분기 데이터가 없어도 터지지 않고 변화율 0 으로 내려간다")
    void storeSurvivesMissingPreviousPeriod() {
        entityManager.persist(storeEntity(CURRENT_PERIOD, 10.0, 5.0));
        entityManager.flush();

        List<StoreDistrictOpenedTopTenProjection> result = storeDistrictRepository
            .findTopTenByOpenedStore(CURRENT_PERIOD, MISSING_PERIOD);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).openingChangeRate()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 분기를 넘겨도 예외가 리포지터리 밖으로 새지 않는다")
    void noExceptionEscapesForUnknownPeriod() {
        entityManager.persist(salesEntity(CURRENT_PERIOD, 1_000L));
        entityManager.persist(storeEntity(CURRENT_PERIOD, 10.0, 5.0));
        entityManager.flush();

        assertThatCode(() -> {
            salesDistrictRepository.findTopTenBySales(CURRENT_PERIOD, MISSING_PERIOD);
            storeDistrictRepository.findTopTenByOpenedStore(CURRENT_PERIOD, MISSING_PERIOD);
            storeDistrictRepository.findTopTenByClosedStore(CURRENT_PERIOD, MISSING_PERIOD);
        }).doesNotThrowAnyException();
    }

    private SalesDistrictEntity salesEntity(String periodCode, long amount) {
        return SalesDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(SPATIAL_VERSION)
            .districtCode(GANGNAM)
            .districtName("강남구")
            .serviceCode("CS100001")
            .serviceName("한식음식점")
            .serviceType(ServiceType.RESTAURANT)
            .monthlySalesAmount(amount)
            .mondaySalesAmount(amount)
            .tuesdaySalesAmount(amount)
            .wednesdaySalesAmount(amount)
            .thursdaySalesAmount(amount)
            .fridaySalesAmount(amount)
            .saturdaySalesAmount(amount)
            .sundaySalesAmount(amount)
            .salesAmountTime00To06(amount)
            .salesAmountTime06To11(amount)
            .salesAmountTime11To14(amount)
            .salesAmountTime14To17(amount)
            .salesAmountTime17To21(amount)
            .salesAmountTime21To24(amount)
            .maleSalesAmount(amount)
            .femaleSalesAmount(amount)
            .age10SalesAmount(amount)
            .age20SalesAmount(amount)
            .age30SalesAmount(amount)
            .age40SalesAmount(amount)
            .age50SalesAmount(amount)
            .age60PlusSalesAmount(amount)
            .build();
    }

    private StoreDistrictEntity storeEntity(String periodCode, double openingRate, double closureRate) {
        return StoreDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(SPATIAL_VERSION)
            .districtCode(GANGNAM)
            .districtName("강남구")
            .serviceCode("CS100001")
            .serviceName("한식음식점")
            .serviceType(ServiceType.RESTAURANT)
            .totalStoreCount(100L)
            .similarStoreCount(50L)
            .openedStoreCount(10L)
            .closedStoreCount(5L)
            .franchiseStoreCount(3L)
            .openingRate(openingRate)
            .closureRate(closureRate)
            .build();
    }
}
