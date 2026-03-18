package com.followfollowme.nowdoboss.domainlayer.community.application.command;

public record CreatePostCommand(

    String targetType,

    String targetCode,

    String title,

    String content

) {

}
