package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 정리 배치 전용 포트.
 *
 * <p>일반 조회/저장 포트와 분리한 이유는, 여기 메서드들이 도메인 규칙이 아니라
 * 물리 데이터 회수 관심사이기 때문이다. 일반 흐름에서 실수로 하드 삭제를 호출하는 것도 막는다.
 */
public interface CommunityCleanupRepositoryPort {

    /**
     * 소프트 삭제 후 보존 기간이 지난 게시글과 그에 딸린 댓글/이미지 연결을 하드 삭제하고,
     * 삭제된 게시글의 이미지 오브젝트 키를 반환한다. (호출부가 커밋 이후 파일을 지운다)
     */
    List<String> hardDeleteExpiredPosts(LocalDateTime threshold, int limit);

    /** 소프트 삭제 후 보존 기간이 지난 댓글을 하드 삭제하고 삭제 건수를 반환한다. */
    int hardDeleteExpiredComments(LocalDateTime threshold, int limit);

    /** 현재 게시글에 연결된 모든 이미지 키. 고아 객체 판정에 쓴다. */
    List<String> findAllReferencedImageKeys();
}
