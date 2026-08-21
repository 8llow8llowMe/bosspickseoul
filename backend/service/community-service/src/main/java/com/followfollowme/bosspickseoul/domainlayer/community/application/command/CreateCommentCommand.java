package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

public record CreateCommentCommand(

    Long parentCommentId,
    String content

) {

}
