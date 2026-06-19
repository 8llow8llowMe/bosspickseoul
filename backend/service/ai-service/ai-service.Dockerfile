# 라즈베리파이 ARM64 호환 JRE 21
FROM ibm-semeru-runtimes:open-21-jre-jammy

# Jenkins 에서 사전 빌드된 JAR 복사 (`./gradlew :service:ai-service:bootJar` 산출물)
ARG JAR_FILE=./app.jar
COPY ${JAR_FILE} /app/ai-service.jar

# Spring AI / Ollama 클라이언트 메모리 여유로 heap 75% 상한 (다른 서비스보다 +5%p)
ENTRYPOINT ["sh", "-c", "java \
  -Duser.timezone=$TIME_ZONE \
  -Dspring.profiles.active=$SPRING_PROFILES_ACTIVE \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=40.0 \
  -jar /app/ai-service.jar"]
