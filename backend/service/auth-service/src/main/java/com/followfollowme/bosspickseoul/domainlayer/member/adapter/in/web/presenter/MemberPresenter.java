package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.item.MemberSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberProfileImageUploadResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberSummariesResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberSummaryInfo;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemberPresenter {

    private final ObjectStorageClient objectStorageClient;

    public MemberMyInfoResponse toMyInfoResponse(MemberMyInfo info) {
        SecurityRole role = info.role();
        return MemberMyInfoResponse.builder()
            .memberId(String.valueOf(info.memberId()))
            .email(info.email())
            .name(info.name())
            .nickname(info.nickname())
            .profileImageUrl(resolveProfileImageUrl(info))
            .role(CodeNameDescriptionMetadata.of(role.name(), role.getDisplayName(), role.getDisplayName()))
            .provider(info.provider() == null ? null : info.provider().name())
            .hasPassword(info.hasPassword())
            .build();
    }

    public MemberProfileImageUploadResponse toProfileImageUploadResponse(MemberMyInfo info) {
        return MemberProfileImageUploadResponse.builder()
            .profileImageKey(info.profileImageKey())
            .profileImageUrl(resolveProfileImageUrl(info))
            .build();
    }

    public MemberSummariesResponse toSummariesResponse(List<MemberSummaryInfo> infos) {
        return MemberSummariesResponse.builder()
            .members(infos.stream()
                .map(info -> MemberSummaryItem.builder()
                    .memberId(String.valueOf(info.memberId()))
                    .nickname(info.nickname())
                    .profileImageUrl(resolveProfileImageUrl(info.profileImageKey(), info.profileImageUrl()))
                    .build())
                .toList())
            .build();
    }

    private String resolveProfileImageUrl(MemberMyInfo info) {
        return resolveProfileImageUrl(info.profileImageKey(), info.profileImageUrl());
    }

    /**
     * 직접 업로드본이 있으면 저장된 키로 공개 URL 을 조립하고, 없으면 소셜 제공자 URL 을 그대로 쓴다.
     * URL 을 DB 에 넣지 않으므로 스토리지 도메인이 바뀌어도 응답만 달라진다.
     */
    private String resolveProfileImageUrl(String profileImageKey, String profileImageUrl) {
        if (profileImageKey != null && !profileImageKey.isBlank()) {
            return objectStorageClient.toPublicUrl(profileImageKey);
        }
        return profileImageUrl;
    }
}
