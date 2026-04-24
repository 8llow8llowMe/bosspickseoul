package com.followfollowme.nowdoboss.domainlayer.community.application.command;

public record CreateCommentCommand(

    Long parentCommentId,
    String content

) {

}
