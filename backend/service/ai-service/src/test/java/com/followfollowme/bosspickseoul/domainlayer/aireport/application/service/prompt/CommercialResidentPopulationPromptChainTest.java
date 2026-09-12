package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialResidentPopulationByAgeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialResidentPopulationClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 총 상주인구가 wire DTO 에서 LLM 프롬프트 문자열까지 실제로 도달하는지 검사한다.
 *
 * <p><b>왜 필요한가.</b> 이 값은 오래 0 으로 흘렀고, 그 사실이 프롬프트에 "총 거주인구: 0" 으로 찍혀도
 * 아무 테스트가 잡지 못했다. 단계별 테스트(골든 = peer JSON → wire, 매퍼 = wire → QueryResult)는 각각의 이음매만 덮는다.
 * 프롬프트까지 이어지는 마지막 구간을 여기서 못 박아, 값이 다시 0 으로 새면 사람이 읽는 문장에서 바로 드러나게 한다.
 *
 * <p><b>덮지 못하는 구간.</b> QueryResult → {@link CommercialAiSourceData} 조립은 {@code AiReportProcessor} 안에 있고
 * 그 지점만 떼어 부르려면 Feign 포트 전부를 스텁해야 해서, 여기서는 해당 한 줄과 같은 대입을 테스트가 직접 한다.
 * adapter 타입을 application 패키지 테스트에서 import 하는 것도 같은 이유다 — 계층을 가로지르는 사슬 자체가 검사 대상이다.
 */
class CommercialResidentPopulationPromptChainTest {

    private final CommercialPromptFormatter formatter = new CommercialPromptFormatter();

    @Test
    @DisplayName("peer 의 byAgeItem.totalResidentPopulation 이 프롬프트의 '총 거주인구' 로 찍힌다")
    void totalResidentPopulationReachesPrompt() {
        CommercialResidentPopulationClientResponse wire = new CommercialResidentPopulationClientResponse(
            new CommercialResidentPopulationByAgeClientResponse(5101L, 5102L, 5103L, 5104L, 5105L, 5106L, 5107L)
        );

        CommercialResidentPopulationQueryResult population = CommercialAnalysisWireMapper.toQueryResult(wire);
        // AiReportProcessor 가 CommercialAiSourceData 를 조립할 때 하는 대입과 같다.
        CommercialAiSourceData sourceData = CommercialAiSourceData.builder()
            .totalResidentPopulationCount(population.totalResidentPopulationCount())
            .largestResidentAgeGroup("60대 이상")
            .build();

        String prompt = formatter.format(sourceData);

        assertThat(prompt).contains("- 총 거주인구: 5,101");
        // 수정 전에는 정확히 이 문장이 모든 상권 AI 리포트에 들어갔다.
        assertThat(prompt).doesNotContain("- 총 거주인구: 0");
    }
}
