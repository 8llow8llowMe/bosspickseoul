package com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "share_link",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_share_link_share_code", columnNames = "shareCode"),
        @UniqueConstraint(name = "uk_share_link_payload_hash", columnNames = "payloadHash")
    },
    // 만료 행 정리 배치가 expiresAt 범위로 스캔한다.
    indexes = {
        @Index(name = "idx_share_link_expires_at", columnList = "expiresAt")
    }
)
@Comment("분석 화면 공유 링크")
public class ShareLinkEntity {

    @Id
    @Comment("공유 링크 아이디")
    private Long id;

    @Column(nullable = false, length = 16)
    @Comment("단축 공유 코드 (base62)")
    private String shareCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Comment("공유 대상 화면 타입")
    private ShareTargetType shareType;

    @Column(nullable = false, length = 2000)
    @Comment("화면 진입 상태 payload (정규화된 JSON, 백엔드는 해석하지 않음)")
    private String payload;

    @Column(nullable = false, length = 64)
    @Comment("shareType + 정규화 payload 의 SHA-256 해시 (중복 공유 방지)")
    private String payloadHash;

    @Comment("최초 공유 회원 아이디 (FK: member.id). 비로그인 생성이면 null")
    private Long memberId;

    @Column(nullable = false)
    @Comment("공유 링크 만료 시각")
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Comment("공유 링크 생성 시각")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Comment("공유 링크 수정 시각")
    private LocalDateTime updatedAt;
}
