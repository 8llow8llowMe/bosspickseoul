package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository.SalesCommercialRepository;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesCommercialRepositoryAdapter implements SalesCommercialRepositoryPort {

    private final SalesCommercialRepository salesCommercialRepository;

    @Override
    public List<String> findDistinctServiceCodesByCommercialCode(String commercialCode) {
        return salesCommercialRepository.findDistinctServiceCodesByCommercialCode(commercialCode);
    }
}
