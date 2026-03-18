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
    name = "community_post_like",
    indexes = {
        @Index(name = "uk_community_post_like_post_member", columnList = "postId,memberId", unique = true),
        @Index(name = "idx_community_post_like_member", columnList = "memberId")
    }
)
@Comment("커뮤니티 게시글 좋아요")
public class CommunityPostLikeEntity {

    @Id
    @Comment("게시글 좋아요 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("게시글 아이디")
    private long postId;

    @Column(nullable = false)
    @Comment("회원 아이디")
    private long memberId;

    @Column(nullable = false)
    @Comment("좋아요 생성 시각")
    private LocalDateTime createdAt;
}
