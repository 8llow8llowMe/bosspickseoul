package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    name = "community_comment_like",
    indexes = {
        @Index(name = "uk_community_comment_like_comment_id_member_id",
            columnList = "commentId,memberId", unique = true),
        @Index(name = "idx_community_comment_like_member_id",
            columnList = "memberId")
    }
)
@Comment("커뮤니티 댓글 좋아요")
public class CommunityCommentLikeEntity {

    @Id
    @Comment("댓글 좋아요 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("댓글 아이디 (FK: community_comment.id)")
    private Long commentId;

    @Column(nullable = false)
    @Comment("회원 아이디 (FK: member.id)")
    private Long memberId;

    @Column(nullable = false)
    @Comment("좋아요 생성 시각")
    private LocalDateTime createdAt;
}
