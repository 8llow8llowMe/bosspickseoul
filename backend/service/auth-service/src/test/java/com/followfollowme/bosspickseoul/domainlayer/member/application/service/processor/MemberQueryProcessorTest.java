package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MemberQueryProcessorTest {

    private StubMemberRepositoryPort memberRepositoryPort;
    private MemberQueryProcessor processor;

    @BeforeEach
    void setUp() {
        memberRepositoryPort = new StubMemberRepositoryPort();
        processor = new MemberQueryProcessor(memberRepositoryPort);
    }

    @Test
    void getSummaries_missingIdsAreOmittedAndDuplicatesCollapsed() {
        memberRepositoryPort.save(member(1L, "사장님A", MemberStatus.ACTIVE));

        List<MemberSummaryInfo> summaries = processor.getSummaries(List.of(1L, 1L, 999L));

        assertThat(summaries).hasSize(1);
        assertThat(summaries.get(0).memberId()).isEqualTo(1L);
        assertThat(summaries.get(0).nickname()).isEqualTo("사장님A");
    }

    @Test
    void getSummaries_withdrawnMemberKeepsMaskedNickname() {
        // 탈퇴 시점에 도메인이 닉네임을 마스킹해 저장하므로, 요약 조회는 상태를 거르지 않고 그대로 내려준다
        memberRepositoryPort.save(member(2L, "사장님B", MemberStatus.ACTIVE).withdraw());

        List<MemberSummaryInfo> summaries = processor.getSummaries(List.of(2L));

        assertThat(summaries.get(0).nickname()).isEqualTo("탈퇴회원");
        assertThat(summaries.get(0).profileImageUrl()).isNull();
    }

    @Test
    void getSummaries_emptyInput_returnsEmpty() {
        assertThat(processor.getSummaries(List.of())).isEmpty();
    }

    @Test
    void getSummaries_overMaxIds_throwsInvalidRequest() {
        List<Long> tooMany = LongStream.rangeClosed(1, 101).boxed().toList();

        assertThatThrownBy(() -> processor.getSummaries(tooMany))
            .isInstanceOf(MemberException.class)
            .extracting(exception -> ((MemberException) exception).getErrorCode())
            .isEqualTo(MemberErrorCode.INVALID_REQUEST);
    }

    private Member member(long id, String nickname, MemberStatus status) {
        return Member.builder()
            .id(id)
            .email("member" + id + "@test.com")
            .name("이름" + id)
            .nickname(nickname)
            .status(status)
            .build();
    }

    private static class StubMemberRepositoryPort implements MemberRepositoryPort {

        private final Map<Long, Member> members = new HashMap<>();

        @Override
        public Member save(Member domain) {
            members.put(domain.id(), domain);
            return domain;
        }

        @Override
        public boolean existsByEmail(String email) {
            return members.values().stream().anyMatch(member -> member.email().equals(email));
        }

        @Override
        public Optional<Member> findByEmail(String email) {
            return members.values().stream().filter(member -> member.email().equals(email)).findFirst();
        }

        @Override
        public Optional<Member> findById(long memberId) {
            return Optional.ofNullable(members.get(memberId));
        }

        @Override
        public List<Member> findAllByIds(Collection<Long> memberIds) {
            return memberIds.stream()
                .map(members::get)
                .filter(java.util.Objects::nonNull)
                .toList();
        }
    }
}
