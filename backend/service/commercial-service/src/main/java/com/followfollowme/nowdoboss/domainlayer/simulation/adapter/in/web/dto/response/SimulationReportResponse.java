package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationConditionItem;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationCostDetailItem;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationGenderAgeItem;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationKeyMoneyItem;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationSeasonItem;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationSimilarFranchiseeItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "창업 시뮬레이션 리포트 응답 DTO")
public record SimulationReportResponse(

    @Schema(description = "시뮬레이션 조건 (요청 조건 + 조회된 명칭)")
    SimulationConditionItem condition,

    @Schema(description = "계산에 사용된 기준 데이터 연도 (임대료/권리금/프랜차이즈 비용 수집 기준)", example = "2024")
    String dataBaseYear,

    @Schema(description = "예상 총 창업 비용 (만원)", example = "12345")
    long totalPrice,

    @Schema(description = "권리금 수준")
    SimulationKeyMoneyItem keyMoney,

    @Schema(description = "비용 상세 (임대료/보증금/인테리어/가맹 부담금)")
    SimulationCostDetailItem costDetail,

    @Schema(description = "예상 총비용과 근접한 유사 프랜차이즈 Top 5")
    List<SimulationSimilarFranchiseeItem> similarFranchisees,

    @Schema(description = "성별·연령 매출 분석 (기준 데이터 없으면 null)", nullable = true)
    SimulationGenderAgeItem genderAgeAnalysis,

    @Schema(description = "성수기/비성수기 분석 (기준 데이터 없으면 null)", nullable = true)
    SimulationSeasonItem seasonAnalysis
) {

}
