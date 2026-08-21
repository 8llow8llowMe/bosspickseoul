package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

/**
 * 게시글 첨부 이미지.
 *
 * <p>게시글 본문과 1:N 으로 분리한 이유는 두 가지다.
 * <ul>
 *   <li>이미지 장수가 가변이라 게시글 컬럼으로 표현하기 어렵다.</li>
 *   <li>{@code CommunityPost} record 에 필드를 추가하면 위치 인자로 재생성하는 7곳이 모두 바뀐다.</li>
 * </ul>
 * URL 이 아니라 오브젝트 키를 저장하고, 공개 URL 조립은 Presenter 가 한다.
 */
public record CommunityPostImage(

    long id,

    long postId,

    String imageKey,

    int sortOrder

) {

}
