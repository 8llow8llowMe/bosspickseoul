package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.ChangeCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.ChangeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChangeCommercialRepositoryAdapterTest {

    @Mock
    private ChangeCommercialRepository changeCommercialRepository;

    @Mock
    private ChangeCommercialMapper changeCommercialMapper;

    private ChangeCommercialRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ChangeCommercialRepositoryAdapter(
            changeCommercialRepository, changeCommercialMapper, "legacy-20233");
    }

    @Test
    void readsTheTypedTableWithTheConfiguredSpatialVersion() {
        ChangeCommercialEntity entity = ChangeCommercialEntity.builder()
            .periodCode("20241").spatialVersion("legacy-20233").commercialCode("3110008")
            .commercialClassificationCode("A").commercialClassificationName("골목상권")
            .commercialName("배화여자대학교").build();
        ChangeCommercial domain = ChangeCommercial.builder()
            .periodCode("20241").commercialCode("3110008")
            .commercialClassificationCode("A").commercialClassificationName("골목상권")
            .commercialName("배화여자대학교").build();
        when(changeCommercialRepository.findByPeriodCodeAndCommercialCodeAndSpatialVersion(
            "20241", "3110008", "legacy-20233")).thenReturn(Optional.of(entity));
        when(changeCommercialMapper.toDomainFromEntity(entity)).thenReturn(domain);

        assertThat(adapter.findByPeriodCodeAndCommercialCode("20241", "3110008"))
            .map(ChangeCommercial::periodCode)
            .contains("20241");
        verify(changeCommercialRepository).findByPeriodCodeAndCommercialCodeAndSpatialVersion(
            "20241", "3110008", "legacy-20233");
    }

    @Test
    void bulkReadFiltersBySpatialVersion() {
        List<String> codes = List.of("3110008", "3110009");
        when(changeCommercialRepository.findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            "20241", "legacy-20233", codes)).thenReturn(List.of());

        assertThat(adapter.findAllByPeriodCodeAndCommercialCodeIn("20241", codes)).isEmpty();
        verify(changeCommercialRepository).findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            "20241", "legacy-20233", codes);
    }
}
