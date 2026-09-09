package com.followfollowme.bosspickseoul.domainlayer.member.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MemberRepositoryPort {

    Member save(Member domain);

    boolean existsByEmail(String email);

    Optional<Member> findByEmail(String email);

    Optional<Member> findById(long memberId);

    /** 존재하는 회원만 반환한다. 미존재 ID 는 결과에서 빠진다. */
    List<Member> findAllByIds(Collection<Long> memberIds);
}
