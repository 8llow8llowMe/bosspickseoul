package com.followfollowme.nowdoboss.domainlayer.simulation.application.service;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.request.SimulationHistorySaveRequest;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.request.SimulationReportRequest;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response.SimulationFranchiseesResponse;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistoriesResponse;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistorySaveResponse;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response.SimulationReportResponse;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response.SimulationStoreSizesResponse;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.presenter.SimulationPresenter;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.command.SimulationHistorySaveCommand;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.command.SimulationReportCommand;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.in.SimulationWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.service.processor.SimulationHistoryProcessor;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.service.processor.SimulationQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.service.processor.SimulationReportProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SimulationWebFacade implements SimulationWebUseCase {

    private static final String DEFAULT_PERIOD_CODE = "20233";

    private final SimulationQueryProcessor simulationQueryProcessor;
    private final SimulationReportProcessor simulationReportProcessor;
    private final SimulationHistoryProcessor simulationHistoryProcessor;
    private final SimulationPresenter simulationPresenter;

    @Override
    @Transactional(readOnly = true)
    public SimulationStoreSizesResponse getStoreSizes(String serviceCode) {
        return simulationPresenter.toStoreSizesResponse(simulationQueryProcessor.getStoreSizes(serviceCode));
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationFranchiseesResponse searchFranchisees(String serviceCode, String keyword, Long lastId) {
        return simulationPresenter.toFranchiseesResponse(
            simulationQueryProcessor.searchFranchisees(serviceCode, keyword, lastId));
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationReportResponse simulate(SimulationReportRequest request) {
        SimulationReportCommand command = SimulationReportCommand.builder()
            .franchisee(Boolean.TRUE.equals(request.franchisee()))
            .franchiseeId(request.franchiseeId())
            .districtCode(request.districtCode())
            .serviceCode(request.serviceCode())
            .storeSize(request.storeSize())
            .floorType(request.floorType())
            .periodCode(request.periodCode() == null ? DEFAULT_PERIOD_CODE : request.periodCode())
            .build();
        return simulationPresenter.toReportResponse(simulationReportProcessor.simulate(command));
    }

    @Override
    @Transactional
    public SimulationHistorySaveResponse saveHistory(long memberId, SimulationHistorySaveRequest request) {
        SimulationHistorySaveCommand command = SimulationHistorySaveCommand.builder()
            .franchisee(Boolean.TRUE.equals(request.franchisee()))
            .franchiseeId(request.franchiseeId())
            .districtCode(request.districtCode())
            .serviceCode(request.serviceCode())
            .storeSize(request.storeSize())
            .floorType(request.floorType())
            .totalPrice(request.totalPrice())
            .build();
        return simulationPresenter.toHistorySaveResponse(simulationHistoryProcessor.save(memberId, command));
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationHistoriesResponse getHistories(long memberId, int page, int size) {
        return simulationPresenter.toHistoriesResponse(simulationHistoryProcessor.getHistories(memberId, page, size));
    }
}
