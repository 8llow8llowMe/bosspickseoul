package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.regional;

import static com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.WireMapperLeafAssertions.assertEveryLeafCopied;
import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@link RegionAnalysisWireMapper} 의 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사한다.
 *
 * <p>검사 방식(말단 필드마다 서로 다른 값을 채우고 경로-값 맵으로 펼쳐 비교)과 그 이유는
 * {@code WireMapperLeafAssertions} 에 정리해 두었다. 여기 6개 컴포넌트는 전부 {@code String} 이라
 * 빠뜨려도 primitive 기본값이 아니라 {@code null} 로 남는데, 상권명·자치구명·행정동명이 null 인 채
 * LLM 프롬프트로 들어가면 0 이 들어가는 것과 마찬가지로 조용히 잘못된 리포트가 나온다.
 */
class RegionAnalysisWireMapperTest {

    @Test
    @DisplayName("상권 소속 지역 wire DTO 의 말단 필드 6개가 모두 QueryResult 로 옮겨진다")
    void commercialAdministrationMapsEveryLeafField() throws Exception {
        // 6개 모두 String 이라 대입을 뒤바꿔도 컴파일된다. 값이 필드마다 달라야 스왑이 잡힌다.
        assertEveryLeafCopied(
            CommercialAdministrationClientResponse.class,
            CommercialAdministrationQueryResult.class,
            wire -> RegionAnalysisWireMapper.toQueryResult((CommercialAdministrationClientResponse) wire),
            6
        );
    }

    @Test
    @DisplayName("wire DTO 자체가 null 이면 null 을 돌려준다")
    void nullWireStaysNull() {
        assertThat(RegionAnalysisWireMapper.toQueryResult(null)).isNull();
    }
}
