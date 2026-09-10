package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetActiveReleaseRepository;
import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.dao.DataAccessResourceFailureException;

@ExtendWith(MockitoExtension.class)
class DatasetReadStartupCheckTest {

    @Mock
    private DatasetActiveReleaseRepository repository;

    @Test
    void disabledFlagDoesNotTouchTheDatabase() {
        new DatasetReadStartupCheck(properties(false), repository).run(new DefaultApplicationArguments());

        verifyNoInteractions(repository);
    }

    @Test
    void enabledFlagWithUnreadableTableFailsStartup() {
        when(repository.count()).thenThrow(new DataAccessResourceFailureException("Table 'dataset_active_release' doesn't exist"));

        assertThatThrownBy(() -> new DatasetReadStartupCheck(properties(true), repository).run(new DefaultApplicationArguments()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("quarterly-dataset-schema.sql");
    }

    @Test
    void enabledFlagWithReadableTablePasses() {
        when(repository.count()).thenReturn(3L);

        assertThatCode(() -> new DatasetReadStartupCheck(properties(true), repository).run(new DefaultApplicationArguments()))
            .doesNotThrowAnyException();
    }

    private static DatasetReadProperties properties(boolean enabled) {
        return new DatasetReadProperties(enabled, "legacy-20233", "seoul-v1", "20241", Duration.ofSeconds(60));
    }
}
