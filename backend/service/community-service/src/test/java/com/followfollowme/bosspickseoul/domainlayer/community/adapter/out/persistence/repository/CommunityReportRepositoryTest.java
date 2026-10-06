package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.global.config.CommunityDataJpaTest;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 신고 사유 코드(#473)의 저장 모양과 모더레이션 목록 파생 쿼리를 실제 스키마(H2)에 질의해 확인한다.
 *
 * <p>MySQL 과 다른 점: 런북 3절의 접두 문자열 백필(UPDATE ... LIKE, CHAR_LENGTH/SUBSTRING)과 콜레이션 비교는 여기서 검증하지 않는다 —
 * 백필 SQL 은 prod/dev MySQL 에서 런북의 확인 쿼리로 본다. 여기서는 컬럼 기본값·nullable 과 쿼리의 조건·정렬만 본다.
 */
@CommunityDataJpaTest
class CommunityReportRepositoryTest {

    private static final LocalDateTime T0 = LocalDateTime.of(2026, 10, 1, 9, 0);

    @Autowired private CommunityReportRepository reportRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    @Test
    @DisplayName("PENDING + 사유 코드로 거르고 오래된 순으로 돌려준다 — 처리된 신고와 다른 사유는 빠진다")
    void findsPendingByReasonCodeOldestFirst() {
        save(1L, ReportStatus.PENDING, CommunityReportReasonCode.SPAM, T0.plusHours(3));
        save(2L, ReportStatus.PENDING, CommunityReportReasonCode.SPAM, T0.plusHours(1));
        save(3L, ReportStatus.PENDING, CommunityReportReasonCode.ABUSE, T0);
        save(4L, ReportStatus.APPROVED, CommunityReportReasonCode.SPAM, T0.minusHours(1));
        save(5L, ReportStatus.DISMISSED, CommunityReportReasonCode.SPAM, T0.minusHours(2));
        save(6L, ReportStatus.PENDING, CommunityReportReasonCode.SPAM, T0.plusHours(2));

        assertThat(reportRepository.findByStatusAndReasonCodeOrderByCreatedAtAsc(ReportStatus.PENDING, CommunityReportReasonCode.SPAM))
            .extracting(CommunityReportEntity::getId).containsExactly(2L, 6L, 1L);
        assertThat(reportRepository.findByStatusAndReasonCodeOrderByCreatedAtAsc(ReportStatus.PENDING, CommunityReportReasonCode.ABUSE))
            .extracting(CommunityReportEntity::getId).containsExactly(3L);
        assertThat(reportRepository.findByStatusAndReasonCodeOrderByCreatedAtAsc(ReportStatus.PENDING, CommunityReportReasonCode.ETC)).isEmpty();
        assertThat(reportRepository.findByStatusOrderByCreatedAtAsc(ReportStatus.PENDING))
            .extracting(CommunityReportEntity::getId).containsExactly(3L, 2L, 6L, 1L);
    }

    @Test
    @DisplayName("상세는 null 과 500자를 모두 저장한다")
    void detailIsNullableUpTo500() {
        reportRepository.saveAndFlush(entity(11L, ReportStatus.PENDING, CommunityReportReasonCode.SPAM, T0, null));
        reportRepository.saveAndFlush(entity(12L, ReportStatus.PENDING, CommunityReportReasonCode.ETC, T0, "가".repeat(500)));
        entityManager.clear();

        assertThat(reportRepository.findById(11L)).get().satisfies(report -> {
            assertThat(report.getReasonCode()).isEqualTo(CommunityReportReasonCode.SPAM);
            assertThat(report.getDetail()).isNull();
        });
        assertThat(reportRepository.findById(12L)).get().extracting(CommunityReportEntity::getDetail).isEqualTo("가".repeat(500));
    }

    @Test
    @DisplayName("사유 코드 없이 들어간 행(이전 버전 INSERT·컬럼 추가 전 행)은 DB 기본값 ETC, 상세 null 로 읽힌다")
    void legacyRowGetsColumnDefaults() {
        // 이전 버전 애플리케이션은 reason_code·detail 을 모른다. 런북·ddl-auto 의 DEFAULT 'ETC' 가 그 INSERT 를 살린다.
        jdbcTemplate.update(
            "insert into community_report (id, target_kind, target_id, reporter_member_id, reason, created_at) values (?, ?, ?, ?, ?, ?)",
            21L, CommunityReportTargetKind.POST.name(), 900L, 30L, "[스팸·홍보] 이전 버전", T0);

        assertThat(reportRepository.findById(21L)).get().satisfies(report -> {
            assertThat(report.getReasonCode()).isEqualTo(CommunityReportReasonCode.ETC);
            assertThat(report.getDetail()).isNull();
            assertThat(report.getStatus()).isEqualTo(ReportStatus.PENDING);
            assertThat(report.getReason()).isEqualTo("[스팸·홍보] 이전 버전");
        });
    }

    private void save(long id, ReportStatus status, CommunityReportReasonCode reasonCode, LocalDateTime createdAt) {
        reportRepository.saveAndFlush(entity(id, status, reasonCode, createdAt, "상세 " + id));
    }

    private static CommunityReportEntity entity(long id, ReportStatus status, CommunityReportReasonCode reasonCode, LocalDateTime createdAt, String detail) {
        return CommunityReportEntity.builder()
            .id(id)
            .targetKind(CommunityReportTargetKind.POST)
            .targetId(900L + id)
            .reporterMemberId(30L)
            .reason(detail == null ? reasonCode.getDisplayName() : detail)
            .reasonCode(reasonCode)
            .detail(detail)
            .createdAt(createdAt)
            .status(status)
            .resolvedAt(status == ReportStatus.PENDING ? null : createdAt.plusMinutes(5))
            .resolvedByMemberId(status == ReportStatus.PENDING ? null : 40L)
            .build();
    }
}
