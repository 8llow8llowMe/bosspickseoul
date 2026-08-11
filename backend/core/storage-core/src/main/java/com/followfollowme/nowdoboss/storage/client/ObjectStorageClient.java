package com.followfollowme.nowdoboss.storage.client;

import com.followfollowme.nowdoboss.storage.exception.StorageErrorCode;
import com.followfollowme.nowdoboss.storage.exception.StorageException;
import com.followfollowme.nowdoboss.storage.model.FileUploadCommand;
import com.followfollowme.nowdoboss.storage.model.ImageFileType;
import com.followfollowme.nowdoboss.storage.model.StorageDomain;
import com.followfollowme.nowdoboss.storage.model.StoredObject;
import com.followfollowme.nowdoboss.storage.properties.StorageProperties;
import com.followfollowme.nowdoboss.storage.util.ObjectKeyFactory;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.io.ByteArrayInputStream;
import java.util.Collection;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 오브젝트 스토리지 접근 공용 클라이언트.
 *
 * <p>업로드/삭제/URL 조립을 한 곳에 모아 서비스마다 같은 코드를 복사하지 않게 한다.
 * 검증(크기·형식)도 여기서 수행하므로 호출부가 빠뜨릴 수 없다.
 */
@Slf4j
@RequiredArgsConstructor
public class ObjectStorageClient {

    private final MinioClient minioClient;
    private final StorageProperties storageProperties;

    /**
     * 이미지 파일을 업로드한다. 검증 실패 시 400 계열 {@link StorageException} 을 던진다.
     *
     * <p>주의: 이 메서드는 원격 I/O 이므로 {@code @Transactional} 블록 안에서 호출하지 않는다.
     * (DB 커넥션을 잡은 채 대기하게 되고, 커밋 실패 시 고아 객체가 남는다)
     */
    public StoredObject uploadImage(StorageDomain domain, long memberId, FileUploadCommand command) {
        byte[] content = requireContent(command);
        if (content.length > storageProperties.normalizedMaxFileBytes()) {
            throw new StorageException(StorageErrorCode.FILE_TOO_LARGE);
        }

        // 확장자·클라이언트 Content-Type 은 신뢰하지 않고 매직 바이트로만 판정한다.
        ImageFileType imageFileType = ImageFileType.detect(content)
            .orElseThrow(() -> new StorageException(StorageErrorCode.UNSUPPORTED_FILE_TYPE));

        String objectKey = ObjectKeyFactory.generate(domain, memberId, imageFileType);
        try (ByteArrayInputStream stream = new ByteArrayInputStream(content)) {
            minioClient.putObject(PutObjectArgs.builder()
                .bucket(storageProperties.bucket())
                .object(objectKey)
                .stream(stream, content.length, -1)
                .contentType(imageFileType.contentType())
                .build());
        } catch (Exception exception) {
            log.error("파일 업로드에 실패했습니다. domain={} memberId={} originalFilename={}",
                domain, memberId, command.originalFilename(), exception);
            throw new StorageException(StorageErrorCode.FILE_UPLOAD_FAILED, exception);
        }

        return new StoredObject(
            objectKey, storageProperties.toPublicUrl(objectKey), imageFileType.contentType(), content.length
        );
    }

    /**
     * 객체를 삭제한다. 실패해도 예외를 던지지 않는다.
     *
     * <p>삭제 실패로 본 요청(회원 정보 수정, 게시글 수정 등)을 되돌리는 것은 사용자에게 손해다.
     * 남은 객체는 고아 정리 배치가 회수한다.
     */
    public void deleteQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                .bucket(storageProperties.bucket())
                .object(objectKey)
                .build());
        } catch (Exception exception) {
            log.warn("파일 삭제에 실패해 고아 객체로 남깁니다. objectKey={} reason={}", objectKey, exception.getMessage());
        }
    }

    /**
     * 트랜잭션 커밋 후에 객체를 삭제한다. 롤백되면 삭제하지 않는다.
     *
     * <p>"DB 는 롤백됐는데 파일은 이미 지워져 깨진 데이터가 되는" 상황을 막는다.
     * 트랜잭션이 없으면 즉시 삭제한다.
     */
    public void deleteAfterCommit(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteQuietly(objectKey);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(objectKey);
            }
        });
    }

    public void deleteAllAfterCommit(Collection<String> objectKeys) {
        if (objectKeys == null) {
            return;
        }
        objectKeys.forEach(this::deleteAfterCommit);
    }

    public String toPublicUrl(String objectKey) {
        return storageProperties.toPublicUrl(objectKey);
    }

    private byte[] requireContent(FileUploadCommand command) {
        return Optional.ofNullable(command)
            .map(FileUploadCommand::content)
            .filter(content -> content.length > 0)
            .orElseThrow(() -> new StorageException(StorageErrorCode.FILE_REQUIRED));
    }
}
