package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity.SimulationHistoryEntity;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.annotation.Import;

/**
 * 이력 목록 정렬을 실제 스키마에 질의해 확인한다.
 *
 * <p>저장 시각만으로 정렬하면 같은 시각에 저장된 행들의 순서가 페이지마다 달라져,
 * 어떤 행은 두 페이지에 나오고 어떤 행은 어느 페이지에도 안 나온다. 시뮬레이션은
 * 같은 조건을 연달아 저장하기 쉬워 실제로 겹친다. id 2차 정렬이 그 경계를 고정한다.
 */
@DataJpaTest
@Import(QuerydslConfigurer.class)
class SimulationHistoryRepositoryTest {

    private static final long MEMBER_ID = 7L;
    private static final LocalDateTime SAME_MOMENT = LocalDateTime.of(2026, 8, 26, 10, 0, 0);

    @Autowired
    private SimulationHistoryRepository simulationHistoryRepository;

    @BeforeEach
    void setUp() {
        simulationHistoryRepository.deleteAll();
    }

    @Test
    @DisplayName("저장 시각이 같아도 id 내림차순으로 순서가 고정된다")
    void sameCreatedAtIsOrderedById() {
        long first = save(SAME_MOMENT);
        long second = save(SAME_MOMENT);
        long third = save(SAME_MOMENT);

        Page<SimulationHistoryEntity> page =
            simulationHistoryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(MEMBER_ID, PageRequest.of(0, 10));

        assertThat(ids(page)).containsExactly(third, second, first);
    }

    @Test
    @DisplayName("저장 시각이 같아도 페이지 경계에서 행이 중복되거나 누락되지 않는다")
    void pageBoundaryHasNoDuplicateOrGap() {
        long first = save(SAME_MOMENT);
        long second = save(SAME_MOMENT);
        long third = save(SAME_MOMENT);
        long fourth = save(SAME_MOMENT);

        List<Long> firstPage = ids(simulationHistoryRepository
            .findAllByMemberIdOrderByCreatedAtDescIdDesc(MEMBER_ID, PageRequest.of(0, 2)));
        List<Long> secondPage = ids(simulationHistoryRepository
            .findAllByMemberIdOrderByCreatedAtDescIdDesc(MEMBER_ID, PageRequest.of(1, 2)));

        assertThat(firstPage).containsExactly(fourth, third);
        assertThat(secondPage).containsExactly(second, first);
        assertThat(firstPage).doesNotContainAnyElementsOf(secondPage);
    }

    private static List<Long> ids(Page<SimulationHistoryEntity> page) {
        return page.getContent().stream().map(SimulationHistoryEntity::getId).toList();
    }

    /** id 는 auto-increment 라 저장 순서대로 커진다. 반환값으로 기대 순서를 만든다. */
    private long save(LocalDateTime createdAt) {
        return simulationHistoryRepository.save(SimulationHistoryEntity.builder()
            .memberId(MEMBER_ID)
            .franchisee(false)
            .districtCode("11680")
            .districtName("강남구")
            .serviceCode("CS100001")
            .serviceName("한식음식점")
            .storeSize(33)
            .floorType(SimulationFloorType.FIRST_FLOOR)
            .totalPrice(10_000_000L)
            .dataBaseYear("2024")
            .createdAt(createdAt)
            .build()).getId();
    }
}
