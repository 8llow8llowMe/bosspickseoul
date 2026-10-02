package com.followfollowme.bosspickseoul.domainlayer.simulation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request.SimulationReportRequest;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.presenter.SimulationPresenter;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.command.SimulationReportCommand;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.service.processor.SimulationReportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 시뮬레이션 리포트가 생략된 분기를 적재 기준 기본 분기로 해석해 커맨드에 싣는지 확인한다(이슈 #464).
 *
 * <p>FE 시뮬레이션은 분기를 생략해 부른다. 예전에는 상수({@code 20261})가 들어갔고 이제는 데이터 기준 기본 분기가 들어가므로,
 * 성별·연령·성수기 분석의 기준 분기가 적재에 따라 움직인다. 해석이 빠지면 null 이 그대로 내려가 조회가 깨진다.
 */
@ExtendWith(MockitoExtension.class)
class SimulationWebFacadePeriodResolutionTest {

    @Mock
    private SimulationReportProcessor simulationReportProcessor;

    @Mock
    private SimulationPresenter simulationPresenter;

    @Mock
    private AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @InjectMocks
    private SimulationWebFacade simulationWebFacade;

    @Test
    @DisplayName("분기를 생략하면 해석된 기본 분기를 커맨드에 싣는다")
    void omittedPeriodIsResolvedIntoTheCommand() {
        when(analysisPeriodCatalogProcessor.resolve(null)).thenReturn("20261");

        simulationWebFacade.simulate(request(null));

        ArgumentCaptor<SimulationReportCommand> command = ArgumentCaptor.forClass(SimulationReportCommand.class);
        verify(simulationReportProcessor).simulate(command.capture());
        assertThat(command.getValue().periodCode()).isEqualTo("20261");
    }

    @Test
    @DisplayName("명시한 분기는 해석기를 거쳐도 그대로 커맨드에 실린다")
    void explicitPeriodIsKept() {
        when(analysisPeriodCatalogProcessor.resolve("20233")).thenReturn("20233");

        simulationWebFacade.simulate(request("20233"));

        ArgumentCaptor<SimulationReportCommand> command = ArgumentCaptor.forClass(SimulationReportCommand.class);
        verify(simulationReportProcessor).simulate(command.capture());
        assertThat(command.getValue().periodCode()).isEqualTo("20233");
    }

    @Test
    @DisplayName("기본 분기를 정할 수 없으면 503 이고 계산하지 않는다")
    void unavailableDefaultStopsTheSimulation() {
        when(analysisPeriodCatalogProcessor.resolve(null))
            .thenThrow(new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE));

        assertThatThrownBy(() -> simulationWebFacade.simulate(request(null))).isInstanceOf(AnalysisPeriodException.class);

        verify(simulationReportProcessor, never()).simulate(any());
    }

    private static SimulationReportRequest request(String periodCode) {
        return new SimulationReportRequest(false, null, "11740", "CS100001", 66, SimulationFloorType.FIRST_FLOOR, periodCode);
    }
}
