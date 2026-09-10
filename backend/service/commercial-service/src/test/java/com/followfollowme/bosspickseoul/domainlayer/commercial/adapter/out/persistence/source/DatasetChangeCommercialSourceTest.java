package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetFactRepository;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DatasetChangeCommercialSourceTest {

    @Mock
    private DatasetFactRepository datasetFactRepository;

    @InjectMocks
    private DatasetChangeCommercialSource source;

    @Test
    void bulkLookupSkipsADefectiveRowInsteadOfFailingTheWholeRequest() {
        // 히트맵은 레거시에서도 "행 없음 = 그 상권만 기본 위험계수" 였다. 데이터셋 경로에서도 행 단위로만 결손된다.
        List<String> codes = List.of("3110008", "3110009");
        when(datasetFactRepository.findAllByIdRunIdAndIdAreaCodeInAndIdServiceCode("run-20241", codes, DatasetFactId.NO_SERVICE))
            .thenReturn(List.of(fact("3110008", true), fact("3110009", false)));

        List<ChangeCommercial> found = source.findAllByRunIdAndCommercialCodeIn("run-20241", "20241", codes);

        assertThat(found).extracting(ChangeCommercial::commercialCode).containsExactly("3110008");
    }

    @Test
    void singleLookupStillFailsClosed() {
        when(datasetFactRepository.findByIdRunIdAndIdAreaCodeAndIdServiceCode("run-20241", "3110009", DatasetFactId.NO_SERVICE))
            .thenReturn(Optional.of(fact("3110009", false)));

        assertThatThrownBy(() -> source.findByRunIdAndCommercialCode("run-20241", "20241", "3110009"))
            .isInstanceOf(DatasetException.class);
    }

    private static DatasetFactEntity fact(String code, boolean complete) {
        Map<String, String> row = new HashMap<>();
        row.put("STDR_YYQU_CD", "20241");
        row.put("TRDAR_SE_CD", "A");
        row.put("TRDAR_SE_CD_NM", "골목상권");
        if (complete) {
            row.put("TRDAR_CD_NM", "배화여자대학교");
        }
        row.put("TRDAR_CHNGE_IX", "HH");
        return DatasetFactEntity.builder().id(new DatasetFactId("run-20241", code, DatasetFactId.NO_SERVICE)).payload(row).build();
    }
}
