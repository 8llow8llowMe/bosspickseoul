package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationIncomeRepositoryAdapter implements AdministrationIncomeRepositoryPort {

    private final IncomeAdministrationRepository incomeAdministrationRepository;

    @Override
    public Optional<IncomeAdministration> findIncomeByAdministrationCode(String administrationCode, String periodCode) {
        return incomeAdministrationRepository.findByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
            .map(entity -> IncomeAdministration.builder()
                .id(entity.getId())
                .periodCode(entity.getPeriodCode())
                .administrationCode(entity.getAdministrationCode())
                .administrationName(entity.getAdministrationName())
                .totalExpenseAmount(entity.getTotalExpenseAmount())
                .build());
    }
}
