package com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import com.followfollowme.bosspickseoul.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 회원 가입 동의·확인 이력.
 *
 * <p>회원당 항목당 여러 행이 쌓일 수 있다(문서 개정 뒤 재동의). 그래서 {@code (memberId, consentType)} 에 unique 를
 * 걸지 않는다. 항목별 최신 동의는 {@code agreedAt} 최대값이다.
 *
 * <p>prod 는 {@code ddl-auto: none} 이라 이 테이블은 {@code scripts/migration/member-consent-table-runbook.sql} 로 만든다.
 * 컬럼을 바꾸면 런북도 함께 고친다 — {@code MemberConsentSchemaContractTest} 가 둘을 대조한다.
 */
@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "member_consent",
    indexes = {
        @Index(name = "idx_member_consent_member_id", columnList = "memberId")
    })
@Comment("회원 가입 동의·확인 이력")
public class MemberConsentEntity extends BaseEntity {

    @Id
    @Comment("동의 이력 아이디 (Snowflake)")
    private Long id;

    @Column(nullable = false)
    @Comment("회원 아이디 (FK: member.id)")
    private Long memberId;

    /**
     * {@code @JdbcTypeCode(VARCHAR)} 로 컬럼 타입을 {@code varchar(30)} 에 고정한다. Hibernate 6 의 MySQL 방언은
     * {@code @Enumerated(STRING)} 를 네이티브 {@code enum('TERMS',...)} 으로 만들어 dev(ddl-auto)와 prod 런북(VARCHAR)이
     * 갈린다. ENUM 이면 항목을 늘릴 때마다 ALTER 가 필요하고, ddl-auto=update 는 기존 컬럼 타입을 고치지 않아 dev 에서
     * 새 항목 INSERT 가 실패한다.
     */
    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Comment("동의·확인 항목 (TERMS / PRIVACY / AGE_OVER_14) - AGE_OVER_14 는 자기신고 확인이라 철회 대상이 아니다")
    private MemberConsentType consentType;

    @Column(nullable = false, length = MemberConsent.DOCUMENT_VERSION_MAX_LENGTH)
    @Comment("동의한 문서 판 - legal.*-version 설정값. AGE_OVER_14 는 만 14세 기준을 규정한 이용약관 판")
    private String documentVersion;

    @Column(nullable = false)
    @Comment("동의 시각 - 한 가입의 항목들은 같은 시각이다. 행 생성 시각(created_at)과 별개로 둔다")
    private LocalDateTime agreedAt;
}
