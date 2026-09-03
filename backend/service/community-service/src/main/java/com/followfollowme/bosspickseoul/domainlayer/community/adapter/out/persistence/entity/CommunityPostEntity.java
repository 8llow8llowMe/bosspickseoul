package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
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
    // 인덱스 뒷자리를 커서 컬럼(id)에 맞춘다. 목록 조회는 createdAt 이 아니라 id 로 정렬/커서를 잡으므로,
    // createdAt 으로 끝나는 인덱스는 정렬에 쓰이지 못하고 filesort 가 발생한다.
    indexes = {
        // 게시판: where targetType, targetCode, status + order by id
        @Index(name = "idx_community_post_target_status_id",
            columnList = "targetType,targetCode,status,id"),
        // 내가 쓴 글: where memberId + order by id
        @Index(name = "idx_community_post_member_id_id",
            columnList = "memberId,id"),
        // 전체 피드(최신): where status + order by id
        @Index(name = "idx_community_post_status_id",
            columnList = "status,id"),
        // 인기순: where status + order by likeCount desc, id desc
        // popularSince(createdAt) 필터는 인덱스 범위로 쓰지 못하고 잔여 조건으로 평가된다.
        // 기간이 넓어 대부분의 행이 통과하므로, 범위 필터보다 정렬을 인덱스로 처리하는 편이 유리하다.
        @Index(name = "idx_community_post_status_like_count_id",
            columnList = "status,likeCount,id")
    }
)
@Comment("커뮤니티 게시글")
public class CommunityPostEntity {

    @Id
    @Comment("게시글 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("회원 아이디 (FK: member.id)")
    private Long memberId;

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
    @Column(length = 30)
    @Comment("분석 첨부 타입 (비교 초안 글에만 값, 일반 글은 null)")
    private CommunityAnalysisType analysisType;

    @Column(length = 100)
    @Comment("분석 참조 코드 (예: 좌상권:우상권:업종:분기)")
    private String analysisRefCode;

    @Column(length = 200)
    @Comment("분석 참조 표시명 (예: A상권 vs B상권)")
    private String analysisRefName;

    @Column(length = 200)
    @Comment("분석 스냅샷 키 (프론트가 비교 화면 재진입에 사용)")
    private String analysisSnapshotKey;

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
    @Comment("게시글 조회 수")
    private long viewCount;

    @Column(nullable = false)
    @Comment("게시글 생성 시각")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Comment("게시글 수정 시각")
    private LocalDateTime updatedAt;
}
