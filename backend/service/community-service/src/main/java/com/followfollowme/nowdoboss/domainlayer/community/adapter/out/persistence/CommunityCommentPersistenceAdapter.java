package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityCommentRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.mapper.CommunityMapper;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCommentPersistenceAdapter implements CommunityCommentPort {

    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityMapper communityMapper;

    @Override
    public List<CommunityComment> getComments(long postId) {
        return communityMapper.toCommentDomainListFromEntityList(
            communityCommentRepository.findByPostIdAndStatusOrderByCreatedAtAsc(postId, CommunityCommentStatus.ACTIVE)
        );
    }

    @Override
    public Optional<CommunityComment> findById(long commentId) {
        return communityCommentRepository.findById(commentId).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public CommunityComment save(CommunityComment comment) {
        return communityMapper.toDomainFromEntity(
            communityCommentRepository.save(communityMapper.toEntityFromDomain(comment))
        );
    }
}
