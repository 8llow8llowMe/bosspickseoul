package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
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

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "community_post",
    indexes = {
        @Index(name = "idx_community_post_target_created", columnList = "targetType,targetCode,createdAt"),
        @Index(name = "idx_community_post_member_created", columnList = "memberId,createdAt"),
        @Index(name = "idx_community_post_status_created", columnList = "status,createdAt")
    }
)
@Comment("커뮤니티 게시글")
public class CommunityPostEntity {

    @Id
    @Comment("게시글 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("회원 아이디")
    private long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("커뮤니티 대상 타입")
    private CommunityTargetType targetType;

    @Column(nullable = false, length = 20)
    @Comment("커뮤니티 대상 코드")
    private String targetCode;

    @Column(nullable = false, length = 100)
    @Comment("커뮤니티 대상 이름")
    private String targetName;

    @Column(nullable = false, length = 120)
    @Comment("게시글 제목")
    private String title;

    @Column(nullable = false, length = 5000)
    @Comment("게시글 본문")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("게시글 상태")
    private CommunityPostStatus status;

    @Column(nullable = false)
    @Comment("게시글 좋아요 수")
    private long likeCount;

    @Column(nullable = false)
    @Comment("게시글 댓글 수")
    private long commentCount;

    @Column(nullable = false)
    @Comment("게시글 생성 시각")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Comment("게시글 수정 시각")
    private LocalDateTime updatedAt;
}
