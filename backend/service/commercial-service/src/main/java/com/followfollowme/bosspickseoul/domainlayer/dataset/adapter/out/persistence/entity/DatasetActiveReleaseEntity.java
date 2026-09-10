package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.Immutable;

/**
 * 슬롯(dataset, period, spatial_version, schema_version)마다 현재 서비스가 읽어야 할 run 을 가리키는 포인터.
 * batch-service 가 게시 트랜잭션에서 갱신하며 이 서비스는 읽기만 한다. run_id 가 null 이면 게시된 release 가 없다.
 */
@Entity
@Immutable
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "dataset_active_release")
@Comment("데이터셋·분기·공간버전·스키마버전 슬롯의 활성 release 포인터 (배치 소유, 읽기 전용)")
public class DatasetActiveReleaseEntity {

    @EmbeddedId
    private DatasetActiveReleaseId id;

    @Comment("활성 release 의 run_id (FK: dataset_release.run_id). null 이면 게시 없음")
    @Column(length = 64)
    private String runId;
}
