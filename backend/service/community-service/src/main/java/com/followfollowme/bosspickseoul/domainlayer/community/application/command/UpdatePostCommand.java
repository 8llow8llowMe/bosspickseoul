package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

import java.util.List;

public record UpdatePostCommand(

    String title,

    String content,

    // 수정 후 말머리. 전체 교체 방식이라 null/blank 면 말머리를 지운다(현재 값을 유지하려면 클라이언트가 다시 보낸다).
    String category,

    // 수정 후 남길 이미지 키 목록. 여기서 빠진 기존 이미지는 삭제된다.
    List<String> imageKeys

) {

}
