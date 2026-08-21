package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

public record AiUsageMeta(
    String modelName,
    int promptTokens,
    int completionTokens
) {

    public static AiUsageMeta empty(String modelName) {
        return new AiUsageMeta(modelName, 0, 0);
    }

    public int totalTokens() {
        return promptTokens + completionTokens;
    }
}
