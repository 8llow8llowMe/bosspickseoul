package com.followfollowme.nowdoboss.domainlayer.community.application.command;

import java.util.List;

public record CreatePostCommand(

    String targetType,

    String targetCode,

    String title,

    String content,

    // 업로드 API가 발급한 오브젝트 키 목록. 순서가 노출 순서가 된다.
    List<String> imageKeys

) {

}
