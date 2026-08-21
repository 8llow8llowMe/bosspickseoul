package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

import java.util.List;

public record UpdatePostCommand(

    String title,

    String content,

    // 수정 후 남길 이미지 키 목록. 여기서 빠진 기존 이미지는 삭제된다.
    List<String> imageKeys

) {

}
