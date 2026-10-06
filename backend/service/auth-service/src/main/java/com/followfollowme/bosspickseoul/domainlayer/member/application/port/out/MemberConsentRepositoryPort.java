package com.followfollowme.bosspickseoul.domainlayer.member.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import java.util.List;

public interface MemberConsentRepositoryPort {

    /**
     * 동의 이력을 한 번에 저장한다. 가입 한 건이 항상 여러 항목을 함께 남기므로, 단건 save 를 반복 호출하지
     * 않도록 계약 자체를 벌크로 둔다 (coding-conventions §9-7).
     *
     * @return 저장된 이력 (도메인 모델)
     */
    List<MemberConsent> saveAll(List<MemberConsent> consents);
}
