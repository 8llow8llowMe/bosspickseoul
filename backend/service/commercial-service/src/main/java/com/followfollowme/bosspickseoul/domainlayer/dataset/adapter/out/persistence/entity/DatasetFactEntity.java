package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * batch-service 가 게시하는 분기 팩트 행. 이 서비스는 읽기만 한다.
 *
 * <p>DDL 은 {@code backend/scripts/migration/quarterly-dataset-schema.sql} 이 소유하고 Hibernate 스키마 도구에서는
 * {@code dataset_} 접두 테이블을 제외한다 (coding-conventions §9-1 의 단일 PK 규칙 예외 — 배치 DDL 을 그대로 미러링한다).
 * payload 키는 서울 Open API 컬럼 코드(예: {@code TRDAR_CHNGE_IX})이고 값은 평문 십진수 문자열이다.
 */
@Entity
@Immutable
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "dataset_fact")
@Comment("분기 적재 배치가 게시한 데이터셋 팩트 행 (배치 소유, 읽기 전용)")
public class DatasetFactEntity {

    @EmbeddedId
    private DatasetFactId id;

    @Comment("서울 Open API 컬럼 코드 -> 값")
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, String> payload;
}
