# 라즈베리파이 ARM64 호환 JRE 21
FROM ibm-semeru-runtimes:open-21-jre-jammy

# Jenkins 에서 사전 빌드된 JAR 복사 (`./gradlew :service:batch-service:bootJar` 산출물)
ARG JAR_FILE=./app.jar
COPY ${JAR_FILE} /app/batch-service.jar

# 컨테이너 메모리 인식 + heap 70% 상한, 시간대 / 프로파일 환경변수 주입
# exec 로 java 가 PID 1 이 돼 SIGTERM·종료 코드를 그대로 전달하고, "$@" 로 `compose run ... --job=...` 인수를 JAR 에 넘긴다.
ENTRYPOINT ["sh", "-c", "exec java \
  -Duser.timezone=$TIME_ZONE \
  -Dspring.profiles.active=$SPRING_PROFILES_ACTIVE \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=70.0 \
  -XX:InitialRAMPercentage=30.0 \
  -jar /app/batch-service.jar \"$@\"", "batch-service"]
