package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
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
    name = "community_post_image",
    indexes = {
        @Index(name = "idx_community_post_image_post_id_sort_order", columnList = "postId,sortOrder")
    }
)
@Comment("커뮤니티 게시글 첨부 이미지")
public class CommunityPostImageEntity {

    @Id
    @Comment("이미지 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("게시글 아이디 (FK: community_post.id)")
    private Long postId;

    @Column(nullable = false, length = 512)
    @Comment("오브젝트 키 (URL 이 아니라 키를 저장한다)")
    private String imageKey;

    @Column(nullable = false)
    @Comment("노출 순서 (0부터)")
    private int sortOrder;
}
