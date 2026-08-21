package com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;
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
    name = "member_bookmark",
    indexes = {
        @Index(name = "idx_member_bookmark_member_id_created_at",
            columnList = "memberId,createdAt"),
        @Index(name = "uk_member_bookmark_member_id_target_type_target_code",
            columnList = "memberId,targetType,targetCode", unique = true)
    }
)
@Comment("회원 북마크")
public class MemberBookmarkEntity {

    @Id
    @Comment("북마크 아이디")
    private Long id;

    @Column(nullable = false)
    @Comment("회원 아이디 (FK: member.id)")
    private Long memberId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Comment("북마크 대상 타입 (COMMERCIAL / ADMINISTRATION / DISTRICT)")
    private MemberBookmarkTargetType targetType;

    @Column(nullable = false, length = 20)
    @Comment("북마크 대상 코드")
    private String targetCode;

    @Column(nullable = false, length = 80)
    @Comment("북마크 대상 이름 (스냅샷)")
    private String targetName;

    @Column(nullable = false, columnDefinition = "TIMESTAMP")
    @Comment("북마크 생성 시각")
    private LocalDateTime createdAt;
}
