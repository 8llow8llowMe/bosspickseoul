package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.out.persistence.entity;

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
    name = "analysis_bookmark",
    // 같은 회원이 같은 화면 상태를 중복 저장하지 못하게 막는다 (payloadHash 는 shareType 포함 해시).
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_analysis_bookmark_member_id_payload_hash", columnNames = {"memberId", "payloadHash"})
    },
    // 회원별 보관함을 최신순으로 조회한다.
    indexes = {
        @Index(name = "idx_analysis_bookmark_member_id_created_at", columnList = "memberId, createdAt")
    })
@Comment("회원의 분석 화면 보관함 (공유 링크와 동일한 payload 포맷, 만료 없음)")
public class AnalysisBookmarkEntity {

    @Id
    @Comment("보관함 항목 아이디")
    private Long id;

    @Comment("회원 아이디 (FK: member.id)")
    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Comment("분석 화면 타입 (공유 링크와 동일 enum)")
    private ShareTargetType shareType;

    @Column(nullable = false, length = 2000)
    @Comment("화면 진입 상태 payload (정규화된 JSON, 백엔드는 해석하지 않음)")
    private String payload;

    @Column(nullable = false, length = 64)
    @Comment("shareType + 정규화 payload 의 SHA-256 해시 (회원별 중복 저장 방지)")
    private String payloadHash;

    @Column(length = 50)
    @Comment("사용자 지정 보관함 이름 (미지정이면 null)")
    private String bookmarkName;

    @Column(nullable = false)
    @Comment("저장 시각")
    private LocalDateTime createdAt;
}
