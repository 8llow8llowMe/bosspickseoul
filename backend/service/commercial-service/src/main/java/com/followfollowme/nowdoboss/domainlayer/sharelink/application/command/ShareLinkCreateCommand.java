package com.followfollowme.nowdoboss.domainlayer.sharelink.application.command;

import com.fasterxml.jackson.databind.JsonNode;

public record ShareLinkCreateCommand(

    String shareType,

    JsonNode payload

) {

}
