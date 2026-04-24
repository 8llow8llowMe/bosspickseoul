package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityCommentStatus;
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
    name = "community_comment",
    indexes = {
        @Index(name = "idx_community_comment_post_created", columnList = "postId,createdAt"),
        @Index(name = "idx_community_comment_member_created", columnList = "memberId,createdAt"),
        @Index(name = "idx_community_comment_parent_id", columnList = "parentCommentId")
    }
)
@Comment("커뮤니티 댓글")
public class CommunityCommentEntity {

    @Id
    @Comment("댓글 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("게시글 아이디")
    private long postId;

    @Column(nullable = false)
    @Comment("회원 아이디")
    private long memberId;

    @Column
    @Comment("부모 댓글 아이디 (null이면 최상위 댓글)")
    private Long parentCommentId;

    @Column(nullable = false, length = 1000)
    @Comment("댓글 본문")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("댓글 상태")
    private CommunityCommentStatus status;

    @Column(nullable = false)
    @Comment("댓글 좋아요 수")
    private long likeCount;

    @Column(nullable = false)
    @Comment("댓글 생성 시각")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Comment("댓글 수정 시각")
    private LocalDateTime updatedAt;
}
