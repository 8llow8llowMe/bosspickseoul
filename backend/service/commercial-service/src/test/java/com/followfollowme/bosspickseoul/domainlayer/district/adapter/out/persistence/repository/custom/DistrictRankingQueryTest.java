package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.FootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.FootTrafficDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.global.config.CommercialDataJpaTest;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

/**
 * 자치구 지표별 전체 순위 조회(이슈 #433)와, 집계식을 나눠 쓰게 된 Top10 조회의 기존 동작을 실제 스키마에 질의해 못 박는다.
 *
 * <p>픽스처는 지표 4종이 같은 자치구 합계 값을 쓴다. 12개 구(Top10 보다 많다) 중
 * <ul>
 *   <li>은평구는 직전 분기 행이 아예 없다 — 전체 순위에는 나오고 변화율이 null 이다</li>
 *   <li>노원구는 직전 분기 값이 0 이다 — 0 으로 나누지 않고 변화율이 null 이다</li>
 *   <li>광진구·중구는 값이 같다 — 자치구 코드 오름차순(중구 11140 → 광진구 11215)이어야 한다. 광진구를 먼저 넣어 삽입 순서와 기대 순서를
 *       엇갈렸지만, 이것으로 동점 정렬을 잡아내는 것은 GROUP BY 가 없는 유동인구뿐이다. H2 는 GROUP BY 결과를 그룹 키
 *       (district_code, district_name) 오름차순으로 내놓아 매출·개업·폐업은 {@code ORDER BY} 에서 동점 정렬을 지워도 결과가 같다.
 *       MySQL 은 그 순서를 보장하지 않으므로 4개 쿼리 모두 생성된 SQL 의 {@code ORDER BY} 를 따로 단언한다({@link OrderBySql})</li>
 *   <li>종로구 매출·점포는 업종 행이 여러 개다 — 현재 분기 3행(CS100001, CS100002, serviceType 이 null 인 미매핑 업종 행),
 *       직전 분기 2행이라 합계·평균이 행을 곱하지 않고 묶이는지, 개업·폐업 변화율이 "평균 대 평균" 인지 가린다</li>
 *   <li>다른 공간 스냅샷(spatial_version) 행 — 은평구·종로구의 직전 분기와 서대문구의 현재 분기 — 은 어느 쪽에도 섞이지 않는다</li>
 * </ul>
 * Top10 은 그대로다: 10건, 결측 변화율 0.0, 유동인구는 직전 분기 행이 없는 구가 INNER JOIN 으로 빠진다.
 */
@CommercialDataJpaTest
@TestPropertySource(properties =
    "spring.jpa.properties.hibernate.session_factory.statement_inspector="
        + "com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom.SqlCapturingStatementInspector")
class DistrictRankingQueryTest {

    private static final String CURRENT_PERIOD = "20261";
    private static final String PREVIOUS_PERIOD = "20254";
    private static final String OTHER_SPATIAL_VERSION = "test-other-spatial-version";

    private static final String EUNPYEONG = "11380";
    private static final String NOWON = "11350";
    private static final String JONGNO = "11110";
    private static final String JUNG = "11140";
    private static final String GWANGJIN = "11215";
    private static final String SEODAEMUN = "11410";

    /** 기대 순위 순서(값 내림차순, 동점은 자치구 코드 오름차순). */
    private static final List<String> EXPECTED_ORDER = List.of(
        EUNPYEONG, NOWON, JONGNO, JUNG, GWANGJIN, "11170", "11200", "11230", "11260", "11290", "11305", "11320");

    /** 자치구 합계 값. 삽입 순서이고 광진구(11215)를 중구(11140)보다 먼저 넣는다. previousValue 가 null 이면 직전 분기 행을 넣지 않는다. */
    private static final List<DistrictFixture> FIXTURES = List.of(
        new DistrictFixture(EUNPYEONG, "은평구", 2_000L, null),
        new DistrictFixture(NOWON, "노원구", 1_800L, 0L),
        new DistrictFixture(JONGNO, "종로구", 1_200L, 1_000L),
        new DistrictFixture(GWANGJIN, "광진구", 1_000L, 800L),
        new DistrictFixture(JUNG, "중구", 1_000L, 1_250L),
        new DistrictFixture("11170", "용산구", 900L, 900L),
        new DistrictFixture("11200", "성동구", 800L, 400L),
        new DistrictFixture("11230", "동대문구", 700L, 700L),
        new DistrictFixture("11260", "중랑구", 600L, 600L),
        new DistrictFixture("11290", "성북구", 500L, 500L),
        new DistrictFixture("11305", "강북구", 400L, 400L),
        new DistrictFixture("11320", "도봉구", 300L, 300L));

    /**
     * 종로구 매출·점포 업종 행. 금액·점포 수 합계는 FIXTURES 와 같다(현재 1,200 · 직전 1,000 → 매출 변화율 20%).
     * 개업률·폐업률 평균은 현재 (3 + 5 + 10) / 3 = 6, 직전 (2 + 6) / 2 = 4 라 변화율이 50% 다.
     * 합계 대 합계(18 대 8 → 125%)나 점포 수 대 점포 수(20%)로 계산하면 50% 가 나오지 않는다.
     */
    private static final List<ServiceRow> JONGNO_SERVICE_ROWS = List.of(
        new ServiceRow(CURRENT_PERIOD, "CS100001", ServiceType.RESTAURANT, 700L, 3.0),
        new ServiceRow(CURRENT_PERIOD, "CS100002", ServiceType.RESTAURANT, 400L, 5.0),
        new ServiceRow(CURRENT_PERIOD, "CS999999", null, 100L, 10.0),
        new ServiceRow(PREVIOUS_PERIOD, "CS100001", ServiceType.RESTAURANT, 800L, 2.0),
        new ServiceRow(PREVIOUS_PERIOD, "CS999999", null, 200L, 6.0));

    private static final double JONGNO_STORE_RATE_CHANGE = 50.0;

    /** 순위 쿼리의 ORDER BY 가 "값 내림차순, 그다음 자치구 코드" 로 끝나는지. Hibernate 는 asc 를 생략한다. */
    private static final Pattern VALUE_DESC_THEN_DISTRICT_CODE =
        Pattern.compile("order by .+ desc\\s*,\\s*\\w+\\.district_code(\\s+asc)?\\s*$", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private DatasetSpatialVersion datasetSpatialVersion;

    @Autowired
    private FootTrafficDistrictRepository footTrafficDistrictRepository;

    @Autowired
    private SalesDistrictRepository salesDistrictRepository;

    @Autowired
    private StoreDistrictRepository storeDistrictRepository;

    @BeforeEach
    void setUp() {
        assertThat(OTHER_SPATIAL_VERSION).isNotEqualTo(datasetSpatialVersion.value());
        entityManager.getEntityManager().createQuery("delete from FootTrafficDistrictEntity").executeUpdate();
        entityManager.getEntityManager().createQuery("delete from SalesDistrictEntity").executeUpdate();
        entityManager.getEntityManager().createQuery("delete from StoreDistrictEntity").executeUpdate();

        String spatialVersion = datasetSpatialVersion.value();
        for (DistrictFixture fixture : FIXTURES) {
            persistFootTraffic(CURRENT_PERIOD, spatialVersion, fixture, fixture.currentValue());
            if (fixture.previousValue() != null) {
                persistFootTraffic(PREVIOUS_PERIOD, spatialVersion, fixture, fixture.previousValue());
            }
            if (fixture.districtCode().equals(JONGNO)) {
                continue;
            }
            persistSingleServiceRow(CURRENT_PERIOD, spatialVersion, fixture, fixture.currentValue());
            if (fixture.previousValue() != null) {
                persistSingleServiceRow(PREVIOUS_PERIOD, spatialVersion, fixture, fixture.previousValue());
            }
        }
        DistrictFixture jongno = fixture(JONGNO);
        for (ServiceRow row : JONGNO_SERVICE_ROWS) {
            entityManager.persist(salesEntity(row.periodCode(), spatialVersion, jongno, row.serviceCode(), row.serviceType(), row.value()));
            entityManager.persist(storeEntity(row.periodCode(), spatialVersion, jongno, row.serviceCode(), row.serviceType(), row.value(), row.rate()));
        }

        // 다른 분기 행은 어느 쪽에도 섞이지 않는다.
        persistAllMetrics("20253", spatialVersion, fixture(EUNPYEONG), 9_999L);
        // 다른 공간 스냅샷 행도 섞이지 않는다. 섞이면 은평구 변화율이 생기고, 종로구 변화율이 바뀌거나 행이 중복되고, 서대문구가 나타난다.
        persistAllMetrics(PREVIOUS_PERIOD, OTHER_SPATIAL_VERSION, fixture(EUNPYEONG), 1_000L);
        persistAllMetrics(PREVIOUS_PERIOD, OTHER_SPATIAL_VERSION, fixture(JONGNO), 1L);
        persistAllMetrics(CURRENT_PERIOD, OTHER_SPATIAL_VERSION, new DistrictFixture(SEODAEMUN, "서대문구", 5_000L, null), 5_000L);

        entityManager.flush();
        entityManager.clear();
    }

    @Nested
    @DisplayName("유동인구 전체 순위")
    class FootTrafficRankings {

        @Test
        @DisplayName("limit 없이 현재 분기 행이 있는 구가 모두 나오고 값 내림차순·코드 오름차순이다")
        void returnsEveryDistrictInDeterministicOrder() {
            List<FootTrafficDistrictRankingProjection> result = rankings();

            assertThat(result).extracting(FootTrafficDistrictRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(result.get(0).totalFootTraffic()).isEqualTo(2_000L);
        }

        @Test
        @DisplayName("직전 분기 행이 없거나 직전 값이 0 이면 변화율이 null 이다")
        void missingOrZeroPreviousIsNull() {
            assertThat(find(rankings(), EUNPYEONG).footTrafficChangeRate()).isNull();
            assertThat(find(rankings(), NOWON).footTrafficChangeRate()).isNull();
        }

        @Test
        @DisplayName("직전 값이 있으면 전분기 대비 증감률(%)이다")
        void computesChangeRate() {
            assertThat(find(rankings(), JONGNO).footTrafficChangeRate()).isCloseTo(20.0, within(1e-9));
            assertThat(find(rankings(), JUNG).footTrafficChangeRate()).isCloseTo(-20.0, within(1e-9));
        }

        private List<FootTrafficDistrictRankingProjection> rankings() {
            return footTrafficDistrictRepository.findRankingsByFootTraffic(CURRENT_PERIOD, PREVIOUS_PERIOD);
        }

        private FootTrafficDistrictRankingProjection find(List<FootTrafficDistrictRankingProjection> rows, String districtCode) {
            return findBy(rows, FootTrafficDistrictRankingProjection::districtCode, districtCode);
        }
    }

    @Nested
    @DisplayName("매출 전체 순위")
    class SalesRankings {

        @Test
        @DisplayName("limit 없이 현재 분기 행이 있는 구가 모두 나오고 값 내림차순·코드 오름차순이다")
        void returnsEveryDistrictInDeterministicOrder() {
            List<SalesDistrictRankingProjection> result = rankings();

            assertThat(result).extracting(SalesDistrictRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(result.get(0).totalSalesAmount()).isEqualTo(2_000L);
        }

        @Test
        @DisplayName("직전 분기 행이 없거나 직전 합계가 0 이면 변화율이 null 이다")
        void missingOrZeroPreviousIsNull() {
            assertThat(find(rankings(), EUNPYEONG).salesChangeRate()).isNull();
            assertThat(find(rankings(), NOWON).salesChangeRate()).isNull();
        }

        @Test
        @DisplayName("직전 합계가 있으면 전분기 대비 증감률(%)이다")
        void computesChangeRate() {
            assertThat(find(rankings(), JONGNO).salesChangeRate()).isCloseTo(20.0, within(1e-9));
            assertThat(find(rankings(), JUNG).salesChangeRate()).isCloseTo(-20.0, within(1e-9));
        }

        @Test
        @DisplayName("업종 행이 여러 개면 업종 전체(미매핑 업종 포함)를 합한 값이고 행이 곱해지지 않는다")
        void sumsEveryServiceRowWithoutMultiplying() {
            List<SalesDistrictRankingProjection> result = rankings();

            assertThat(result).hasSize(EXPECTED_ORDER.size());
            // 현재 700 + 400 + 100(serviceType null). 직전 2행과 조인해 곱해졌다면 2,400 이 된다.
            assertThat(find(result, JONGNO).totalSalesAmount()).isEqualTo(1_200L);
        }

        private List<SalesDistrictRankingProjection> rankings() {
            return salesDistrictRepository.findRankingsBySales(CURRENT_PERIOD, PREVIOUS_PERIOD);
        }

        private SalesDistrictRankingProjection find(List<SalesDistrictRankingProjection> rows, String districtCode) {
            return findBy(rows, SalesDistrictRankingProjection::districtCode, districtCode);
        }
    }

    @Nested
    @DisplayName("개업 점포 전체 순위")
    class OpenedStoreRankings {

        @Test
        @DisplayName("limit 없이 현재 분기 행이 있는 구가 모두 나오고 개업 점포 수 내림차순·코드 오름차순이다")
        void returnsEveryDistrictInDeterministicOrder() {
            List<StoreDistrictOpenedRankingProjection> result = rankings();

            assertThat(result).extracting(StoreDistrictOpenedRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(result.get(0).openedStoreCount()).isEqualTo(2_000L);
        }

        @Test
        @DisplayName("직전 분기 행이 없거나 직전 개업률 평균이 0 이면 변화율이 null 이다")
        void missingOrZeroPreviousIsNull() {
            assertThat(find(rankings(), EUNPYEONG).openingChangeRate()).isNull();
            assertThat(find(rankings(), NOWON).openingChangeRate()).isNull();
        }

        @Test
        @DisplayName("직전 개업률 평균이 있으면 개업률의 전분기 대비 증감률(%)이다")
        void computesChangeRate() {
            assertThat(find(rankings(), GWANGJIN).openingChangeRate()).isCloseTo(25.0, within(1e-9));
            assertThat(find(rankings(), JUNG).openingChangeRate()).isCloseTo(-20.0, within(1e-9));
        }

        @Test
        @DisplayName("업종 행이 여러 개면 개업 점포 수는 합계, 변화율은 개업률 평균 대 평균이고 Top10 과 같다")
        void sumsCountsAndComparesRateAverages() {
            List<StoreDistrictOpenedRankingProjection> result = rankings();
            StoreDistrictOpenedTopTenProjection topTen = findBy(storeDistrictRepository.findTopTenByOpenedStore(CURRENT_PERIOD, PREVIOUS_PERIOD),
                StoreDistrictOpenedTopTenProjection::districtCode, JONGNO);

            assertThat(result).hasSize(EXPECTED_ORDER.size());
            assertThat(find(result, JONGNO).openedStoreCount()).isEqualTo(1_200L).isEqualTo(topTen.openedStoreCount());
            assertThat(find(result, JONGNO).openingChangeRate()).isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
            assertThat(find(result, JONGNO).openingChangeRate()).isCloseTo(topTen.openingChangeRate(), within(1e-9));
        }

        private List<StoreDistrictOpenedRankingProjection> rankings() {
            return storeDistrictRepository.findRankingsByOpenedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);
        }

        private StoreDistrictOpenedRankingProjection find(List<StoreDistrictOpenedRankingProjection> rows, String districtCode) {
            return findBy(rows, StoreDistrictOpenedRankingProjection::districtCode, districtCode);
        }
    }

    @Nested
    @DisplayName("폐업 점포 전체 순위")
    class ClosedStoreRankings {

        @Test
        @DisplayName("limit 없이 현재 분기 행이 있는 구가 모두 나오고 폐업 점포 수 내림차순·코드 오름차순이다")
        void returnsEveryDistrictInDeterministicOrder() {
            List<StoreDistrictClosedRankingProjection> result = rankings();

            assertThat(result).extracting(StoreDistrictClosedRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(result.get(0).closedStoreCount()).isEqualTo(2_000L);
        }

        @Test
        @DisplayName("직전 분기 행이 없거나 직전 폐업률 평균이 0 이면 변화율이 null 이다")
        void missingOrZeroPreviousIsNull() {
            assertThat(find(rankings(), EUNPYEONG).closureChangeRate()).isNull();
            assertThat(find(rankings(), NOWON).closureChangeRate()).isNull();
        }

        @Test
        @DisplayName("직전 폐업률 평균이 있으면 폐업률의 전분기 대비 증감률(%)이다")
        void computesChangeRate() {
            assertThat(find(rankings(), GWANGJIN).closureChangeRate()).isCloseTo(25.0, within(1e-9));
            assertThat(find(rankings(), JUNG).closureChangeRate()).isCloseTo(-20.0, within(1e-9));
        }

        @Test
        @DisplayName("업종 행이 여러 개면 폐업 점포 수는 합계, 변화율은 폐업률 평균 대 평균이고 Top10 과 같다")
        void sumsCountsAndComparesRateAverages() {
            List<StoreDistrictClosedRankingProjection> result = rankings();
            StoreDistrictClosedTopTenProjection topTen = findBy(storeDistrictRepository.findTopTenByClosedStore(CURRENT_PERIOD, PREVIOUS_PERIOD),
                StoreDistrictClosedTopTenProjection::districtCode, JONGNO);

            assertThat(result).hasSize(EXPECTED_ORDER.size());
            assertThat(find(result, JONGNO).closedStoreCount()).isEqualTo(1_200L).isEqualTo(topTen.closedStoreCount());
            assertThat(find(result, JONGNO).closureChangeRate()).isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
            assertThat(find(result, JONGNO).closureChangeRate()).isCloseTo(topTen.closureChangeRate(), within(1e-9));
        }

        private List<StoreDistrictClosedRankingProjection> rankings() {
            return storeDistrictRepository.findRankingsByClosedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);
        }

        private StoreDistrictClosedRankingProjection find(List<StoreDistrictClosedRankingProjection> rows, String districtCode) {
            return findBy(rows, StoreDistrictClosedRankingProjection::districtCode, districtCode);
        }
    }

    @Nested
    @DisplayName("다른 공간 스냅샷 행은 섞이지 않는다")
    class SpatialVersionIsolation {

        @Test
        @DisplayName("다른 공간 스냅샷의 직전 분기 행으로 변화율이 생기거나 바뀌지 않고 행도 중복되지 않는다")
        void otherSpatialVersionDoesNotLeak() {
            List<FootTrafficDistrictRankingProjection> footTraffic =
                footTrafficDistrictRepository.findRankingsByFootTraffic(CURRENT_PERIOD, PREVIOUS_PERIOD);
            List<SalesDistrictRankingProjection> sales = salesDistrictRepository.findRankingsBySales(CURRENT_PERIOD, PREVIOUS_PERIOD);
            List<StoreDistrictOpenedRankingProjection> opened = storeDistrictRepository.findRankingsByOpenedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);
            List<StoreDistrictClosedRankingProjection> closed = storeDistrictRepository.findRankingsByClosedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);

            // 서대문구는 다른 스냅샷의 현재 분기에만 있다. 중복 행이 생기면 순서 목록과 어긋난다.
            assertThat(footTraffic).extracting(FootTrafficDistrictRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(sales).extracting(SalesDistrictRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(opened).extracting(StoreDistrictOpenedRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);
            assertThat(closed).extracting(StoreDistrictClosedRankingProjection::districtCode).containsExactlyElementsOf(EXPECTED_ORDER);

            // 은평구는 이 스냅샷에 직전 분기 행이 없다.
            assertThat(findBy(footTraffic, FootTrafficDistrictRankingProjection::districtCode, EUNPYEONG).footTrafficChangeRate()).isNull();
            assertThat(findBy(sales, SalesDistrictRankingProjection::districtCode, EUNPYEONG).salesChangeRate()).isNull();
            assertThat(findBy(opened, StoreDistrictOpenedRankingProjection::districtCode, EUNPYEONG).openingChangeRate()).isNull();
            assertThat(findBy(closed, StoreDistrictClosedRankingProjection::districtCode, EUNPYEONG).closureChangeRate()).isNull();

            // 종로구 변화율은 이 스냅샷의 직전 분기 값만으로 계산한다.
            assertThat(findBy(footTraffic, FootTrafficDistrictRankingProjection::districtCode, JONGNO).footTrafficChangeRate())
                .isCloseTo(20.0, within(1e-9));
            assertThat(findBy(sales, SalesDistrictRankingProjection::districtCode, JONGNO).salesChangeRate()).isCloseTo(20.0, within(1e-9));
            assertThat(findBy(opened, StoreDistrictOpenedRankingProjection::districtCode, JONGNO).openingChangeRate())
                .isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
            assertThat(findBy(closed, StoreDistrictClosedRankingProjection::districtCode, JONGNO).closureChangeRate())
                .isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
        }
    }

    @Nested
    @DisplayName("순위 쿼리 SQL 은 값 내림차순 다음에 자치구 코드로 정렬한다")
    class OrderBySql {

        @Test
        @DisplayName("유동인구")
        void footTraffic() {
            assertOrderedByValueThenDistrictCode(() -> footTrafficDistrictRepository.findRankingsByFootTraffic(CURRENT_PERIOD, PREVIOUS_PERIOD));
        }

        @Test
        @DisplayName("매출")
        void sales() {
            assertOrderedByValueThenDistrictCode(() -> salesDistrictRepository.findRankingsBySales(CURRENT_PERIOD, PREVIOUS_PERIOD));
        }

        @Test
        @DisplayName("개업 점포")
        void openedStore() {
            assertOrderedByValueThenDistrictCode(() -> storeDistrictRepository.findRankingsByOpenedStore(CURRENT_PERIOD, PREVIOUS_PERIOD));
        }

        @Test
        @DisplayName("폐업 점포")
        void closedStore() {
            assertOrderedByValueThenDistrictCode(() -> storeDistrictRepository.findRankingsByClosedStore(CURRENT_PERIOD, PREVIOUS_PERIOD));
        }
    }

    @Nested
    @DisplayName("Top10 은 집계식을 나눠 쓴 뒤에도 그대로다")
    class TopTenRegression {

        @Test
        @DisplayName("유동인구: 직전 분기 행이 없는 구는 INNER JOIN 으로 빠지고, 10건이며, 직전 값 0 은 변화율 0.0 이다")
        void footTrafficKeepsInnerJoinAndZeroFallback() {
            List<FootTrafficDistrictTopTenProjection> result =
                footTrafficDistrictRepository.findTopTenByFootTraffic(CURRENT_PERIOD, PREVIOUS_PERIOD);

            assertThat(result).hasSize(10);
            assertThat(result).extracting(FootTrafficDistrictTopTenProjection::districtCode).doesNotContain(EUNPYEONG).doesNotHaveDuplicates();
            assertThat(result).extracting(FootTrafficDistrictTopTenProjection::totalFootTraffic).isSortedAccordingTo((a, b) -> Long.compare(b, a));
            assertThat(result.get(0).districtCode()).isEqualTo(NOWON);
            assertThat(result.get(0).footTrafficChangeRate()).isZero();
            assertThat(findBy(result, FootTrafficDistrictTopTenProjection::districtCode, JONGNO).footTrafficChangeRate())
                .isCloseTo(20.0, within(1e-9));
        }

        @Test
        @DisplayName("매출: 10건이고 직전 분기 행이 없거나 합계가 0 이면 변화율 0.0 이다")
        void salesKeepsLimitAndZeroFallback() {
            List<SalesDistrictTopTenProjection> result = salesDistrictRepository.findTopTenBySales(CURRENT_PERIOD, PREVIOUS_PERIOD);

            assertThat(result).hasSize(10);
            assertThat(result).extracting(SalesDistrictTopTenProjection::totalSalesAmount).isSortedAccordingTo((a, b) -> Long.compare(b, a));
            assertThat(findBy(result, SalesDistrictTopTenProjection::districtCode, EUNPYEONG).salesChangeRate()).isZero();
            assertThat(findBy(result, SalesDistrictTopTenProjection::districtCode, NOWON).salesChangeRate()).isZero();
            assertThat(findBy(result, SalesDistrictTopTenProjection::districtCode, JONGNO).totalSalesAmount()).isEqualTo(1_200L);
            assertThat(findBy(result, SalesDistrictTopTenProjection::districtCode, JONGNO).salesChangeRate()).isCloseTo(20.0, within(1e-9));
        }

        @Test
        @DisplayName("개업: 10건이고 직전 분기 행이 없거나 평균이 0 이면 변화율 0.0 이다")
        void openedStoreKeepsLimitAndZeroFallback() {
            List<StoreDistrictOpenedTopTenProjection> result = storeDistrictRepository.findTopTenByOpenedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);

            assertThat(result).hasSize(10);
            assertThat(result).extracting(StoreDistrictOpenedTopTenProjection::openedStoreCount).isSortedAccordingTo((a, b) -> Long.compare(b, a));
            assertThat(findBy(result, StoreDistrictOpenedTopTenProjection::districtCode, EUNPYEONG).openingChangeRate()).isZero();
            assertThat(findBy(result, StoreDistrictOpenedTopTenProjection::districtCode, NOWON).openingChangeRate()).isZero();
            assertThat(findBy(result, StoreDistrictOpenedTopTenProjection::districtCode, JONGNO).openingChangeRate())
                .isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
        }

        @Test
        @DisplayName("폐업: 10건이고 직전 분기 행이 없거나 평균이 0 이면 변화율 0.0 이다")
        void closedStoreKeepsLimitAndZeroFallback() {
            List<StoreDistrictClosedTopTenProjection> result = storeDistrictRepository.findTopTenByClosedStore(CURRENT_PERIOD, PREVIOUS_PERIOD);

            assertThat(result).hasSize(10);
            assertThat(result).extracting(StoreDistrictClosedTopTenProjection::closedStoreCount).isSortedAccordingTo((a, b) -> Long.compare(b, a));
            assertThat(findBy(result, StoreDistrictClosedTopTenProjection::districtCode, EUNPYEONG).closureChangeRate()).isZero();
            assertThat(findBy(result, StoreDistrictClosedTopTenProjection::districtCode, NOWON).closureChangeRate()).isZero();
            assertThat(findBy(result, StoreDistrictClosedTopTenProjection::districtCode, JONGNO).closureChangeRate())
                .isCloseTo(JONGNO_STORE_RATE_CHANGE, within(1e-9));
        }
    }

    private static void assertOrderedByValueThenDistrictCode(Runnable query) {
        SqlCapturingStatementInspector.clear();
        query.run();
        String sql = SqlCapturingStatementInspector.lastSelect();

        assertThat(VALUE_DESC_THEN_DISTRICT_CODE.matcher(sql).find())
            .as("ORDER BY 가 값 내림차순 다음 district_code 로 끝나야 한다: %s", sql)
            .isTrue();
    }

    private static DistrictFixture fixture(String districtCode) {
        return FIXTURES.stream()
            .filter(fixture -> fixture.districtCode().equals(districtCode))
            .findFirst()
            .orElseThrow();
    }

    private static <T> T findBy(List<T> rows, Function<T, String> districtCode, String expected) {
        return rows.stream()
            .filter(row -> districtCode.apply(row).equals(expected))
            .findFirst()
            .orElseThrow(() -> new AssertionError("자치구 " + expected + " 가 결과에 없다"));
    }

    private void persistAllMetrics(String periodCode, String spatialVersion, DistrictFixture fixture, long value) {
        persistFootTraffic(periodCode, spatialVersion, fixture, value);
        persistSingleServiceRow(periodCode, spatialVersion, fixture, value);
    }

    private void persistFootTraffic(String periodCode, String spatialVersion, DistrictFixture fixture, long value) {
        entityManager.persist(footTrafficEntity(periodCode, spatialVersion, fixture, value));
    }

    /** 매출·점포를 업종 1행으로 넣는다. 개업률·폐업률은 값의 1/100 이라 변화율 기대값이 다른 지표와 같다. */
    private void persistSingleServiceRow(String periodCode, String spatialVersion, DistrictFixture fixture, long value) {
        entityManager.persist(salesEntity(periodCode, spatialVersion, fixture, "CS100001", ServiceType.RESTAURANT, value));
        entityManager.persist(storeEntity(periodCode, spatialVersion, fixture, "CS100001", ServiceType.RESTAURANT, value, value / 100.0));
    }

    private FootTrafficDistrictEntity footTrafficEntity(String periodCode, String spatialVersion, DistrictFixture fixture, long value) {
        return FootTrafficDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(spatialVersion)
            .districtCode(fixture.districtCode())
            .districtName(fixture.districtName())
            .totalFootTraffic(value)
            .maleFootTraffic(value).femaleFootTraffic(value)
            .age10FootTraffic(value).age20FootTraffic(value).age30FootTraffic(value)
            .age40FootTraffic(value).age50FootTraffic(value).age60PlusFootTraffic(value)
            .footTrafficTime00To06(value).footTrafficTime06To11(value).footTrafficTime11To14(value)
            .footTrafficTime14To17(value).footTrafficTime17To21(value).footTrafficTime21To24(value)
            .mondayFootTraffic(value).tuesdayFootTraffic(value).wednesdayFootTraffic(value).thursdayFootTraffic(value)
            .fridayFootTraffic(value).saturdayFootTraffic(value).sundayFootTraffic(value)
            .build();
    }

    private SalesDistrictEntity salesEntity(
        String periodCode, String spatialVersion, DistrictFixture fixture, String serviceCode, ServiceType serviceType, long amount
    ) {
        return SalesDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(spatialVersion)
            .districtCode(fixture.districtCode())
            .districtName(fixture.districtName())
            .serviceCode(serviceCode)
            .serviceName(serviceType == null ? "미매핑업종" : "한식음식점")
            .serviceType(serviceType)
            .monthlySalesAmount(amount)
            .mondaySalesAmount(amount).tuesdaySalesAmount(amount).wednesdaySalesAmount(amount).thursdaySalesAmount(amount)
            .fridaySalesAmount(amount).saturdaySalesAmount(amount).sundaySalesAmount(amount)
            .salesAmountTime00To06(amount).salesAmountTime06To11(amount).salesAmountTime11To14(amount)
            .salesAmountTime14To17(amount).salesAmountTime17To21(amount).salesAmountTime21To24(amount)
            .maleSalesAmount(amount).femaleSalesAmount(amount)
            .age10SalesAmount(amount).age20SalesAmount(amount).age30SalesAmount(amount)
            .age40SalesAmount(amount).age50SalesAmount(amount).age60PlusSalesAmount(amount)
            .build();
    }

    /** 개업·폐업 점포 수는 같은 값, 개업률·폐업률은 같은 rate 로 둔다. 그래서 개업·폐업 기대값이 같다. */
    private StoreDistrictEntity storeEntity(
        String periodCode, String spatialVersion, DistrictFixture fixture, String serviceCode, ServiceType serviceType, long count, double rate
    ) {
        return StoreDistrictEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(spatialVersion)
            .districtCode(fixture.districtCode())
            .districtName(fixture.districtName())
            .serviceCode(serviceCode)
            .serviceName(serviceType == null ? "미매핑업종" : "한식음식점")
            .serviceType(serviceType)
            .totalStoreCount(count)
            .similarStoreCount(count)
            .openedStoreCount(count)
            .closedStoreCount(count)
            .franchiseStoreCount(0L)
            .openingRate(rate)
            .closureRate(rate)
            .build();
    }

    private record DistrictFixture(String districtCode, String districtName, long currentValue, Long previousValue) {
    }

    private record ServiceRow(String periodCode, String serviceCode, ServiceType serviceType, long value, double rate) {
    }
}
