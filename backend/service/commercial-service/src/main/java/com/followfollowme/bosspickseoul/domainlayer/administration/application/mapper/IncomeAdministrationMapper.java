package com.followfollowme.bosspickseoul.domainlayer.administration.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import org.mapstruct.Mapper;

/**
 * 세부 10항목이 붙으면서 손으로 쓴 빌더가 두 어댑터에 중복돼 한쪽만 갱신될 위험이 생겼다. 항목을 늘릴 때
 * 갈라지지 않도록 매핑을 한 곳으로 모은다. (이슈 #415)
 */
@Mapper(componentModel = "spring")
public interface IncomeAdministrationMapper {

    IncomeAdministration toDomainFromEntity(IncomeAdministrationEntity entity);
}
