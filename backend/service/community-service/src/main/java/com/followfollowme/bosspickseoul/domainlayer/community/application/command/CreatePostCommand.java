package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

import java.util.List;

public record CreatePostCommand(

    String targetType,

    String targetCode,

    String title,

    String content,

    // 업로드 API가 발급한 오브젝트 키 목록. 순서가 노출 순서가 된다.
    List<String> imageKeys,

    // 분석 첨부 (선택) — 비교 초안 응답의 analysis* 4필드를 그대로 되돌려 받는다.
    String analysisType,

    String analysisRefCode,

    String analysisRefName,

    String analysisSnapshotKey

) {

}
