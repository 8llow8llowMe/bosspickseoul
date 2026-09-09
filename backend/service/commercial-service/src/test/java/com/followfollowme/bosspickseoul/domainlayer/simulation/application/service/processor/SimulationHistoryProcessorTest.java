package com.followfollowme.bosspickseoul.domainlayer.simulation.application.service.processor;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationException;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationHistoryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationRentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SimulationHistoryProcessorTest {

    private static final long MEMBER_ID = 1L;
    private static final long HISTORY_ID = 100L;

    @Mock
    private SimulationHistoryRepositoryPort historyPort;

    @Mock
    private SimulationServiceTypeRepositoryPort serviceTypePort;

    @Mock
    private SimulationRentRepositoryPort rentPort;

    @Mock
    private SimulationFranchiseeRepositoryPort franchiseePort;

    @InjectMocks
    private SimulationHistoryProcessor processor;

    @Test
    void delete_removesOwnHistory() {
        when(historyPort.deleteByIdAndMemberId(HISTORY_ID, MEMBER_ID)).thenReturn(1);

        assertThatCode(() -> processor.delete(MEMBER_ID, HISTORY_ID)).doesNotThrowAnyException();

        // 소유자 조건을 포트에 그대로 넘겨 단일 쿼리로 처리한다 (조회 후 비교 없음)
        verify(historyPort).deleteByIdAndMemberId(HISTORY_ID, MEMBER_ID);
    }

    @Test
    void delete_rejectsOtherMembersHistoryAsNotFound() {
        // 타인 항목은 소유자 조건에 걸려 0건이 삭제된다. 존재 여부를 노출하지 않도록 미존재와 동일하게 404.
        when(historyPort.deleteByIdAndMemberId(HISTORY_ID, 2L)).thenReturn(0);

        assertThatThrownBy(() -> processor.delete(2L, HISTORY_ID))
            .isInstanceOf(SimulationException.class)
            .extracting(error -> ((SimulationException) error).getErrorCode())
            .isEqualTo(SimulationErrorCode.HISTORY_NOT_FOUND);
    }

    @Test
    void delete_rejectsMissingHistoryAsNotFound() {
        when(historyPort.deleteByIdAndMemberId(999L, MEMBER_ID)).thenReturn(0);

        assertThatThrownBy(() -> processor.delete(MEMBER_ID, 999L))
            .isInstanceOf(SimulationException.class)
            .extracting(error -> ((SimulationException) error).getErrorCode())
            .isEqualTo(SimulationErrorCode.HISTORY_NOT_FOUND);
    }
}
