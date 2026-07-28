Map<String, String> resolveGitContext() {
    String requestedTargetBranch = params.TARGET_BRANCH?.trim()
    String requestedPrSha = params.PR_SHA?.trim()
    String requestedPrNumber = params.PR_NUMBER?.trim()

    String effectiveTargetBranch = requestedTargetBranch
    if (!effectiveTargetBranch) {
        effectiveTargetBranch = env.CHANGE_TARGET?.trim() ?: env.BRANCH_NAME
    }

    String deployEnv = 'none'
    if (effectiveTargetBranch == 'main') {
        deployEnv = 'prod'
    } else if (effectiveTargetBranch == 'develop') {
        deployEnv = 'dev'
    }

    return [
        requestedTargetBranch: requestedTargetBranch ?: '',
        effectiveTargetBranch: effectiveTargetBranch ?: '',
        requestedPrSha      : requestedPrSha ?: '',
        requestedPrNumber   : requestedPrNumber ?: '',
        deployEnv           : deployEnv,
        isPullRequest       : env.CHANGE_ID?.trim() ? 'true' : 'false'
    ]
}

void checkoutSource() {
    if (params.PR_SHA?.trim()) {
        echo "요청한 PR 커밋 SHA를 체크아웃합니다: ${params.PR_SHA}"
        checkout([
            $class: 'GitSCM',
            branches: [[name: params.PR_SHA.trim()]],
            userRemoteConfigs: scm.userRemoteConfigs,
            extensions: [
                [$class: 'SubmoduleOption', recursiveSubmodules: true, parentCredentials: true]
            ]
        ])
        return
    }

    echo '멀티브랜치 파이프라인 기본 SCM 컨텍스트로 체크아웃합니다.'
    checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        userRemoteConfigs: scm.userRemoteConfigs,
        extensions: [
            [$class: 'SubmoduleOption', recursiveSubmodules: true, parentCredentials: true]
        ]
    ])
}

Map<String, Object> resolveVaultSpec(Map<String, String> config, Map<String, String> ctx) {
    String projectSlug = params.PROJECT_SLUG?.trim() ?: 'bosspickseoul'
    String vaultSecretRoot = params.VAULT_SECRET_ROOT?.trim() ?: "kv/${projectSlug}/backend"
    String vaultSecretPath = params.VAULT_SECRET_PATH?.trim() ?: "${vaultSecretRoot}/${ctx.deployEnv}/env"
    Integer engineVersion = (params.VAULT_ENGINE_VERSION ?: '2') as Integer

    return [
        path         : vaultSecretPath,
        // KV v2는 mount path와 secret path 사이에 /data/가 필요합니다.
        apiPath      : resolveVaultApiPath(vaultSecretPath, engineVersion),
        engineVersion: engineVersion
    ]
}

String resolveDeployAgentLabel(Map<String, Object> config, Map<String, String> ctx) {
    Map<String, String> deployAgentLabels = config.deployAgentLabels ?: [:]
    String deployAgentLabel = deployAgentLabels[ctx.deployEnv] ?: config.deployAgentLabel

    if (!deployAgentLabel?.trim()) {
        error "배포 agent label을 찾을 수 없습니다. deployEnv=${ctx.deployEnv}"
    }

    return deployAgentLabel.trim()
}

boolean shouldDeployToEnvironment(Map<String, String> ctx) {
    if (params.SKIP_DEPLOY || !(ctx.deployEnv in ['dev', 'prod'])) {
        return false
    }

    // PR 빌드는 CI(빌드/테스트)만 수행하고 배포하지 않습니다.
    // dev 환경은 develop 브랜치 머지 빌드만 배포해 "dev = develop 미러"를 보장합니다.
    // (과거에는 PR도 dev를 배포했지만, develop 머지 빌드와 같은 dev 환경을 두고 경합하여
    //  머지되지 않은 PR 배포가 develop 빌드로 덮이는 혼선이 있었습니다.)
    if (ctx.isPullRequest == 'true') {
        return false
    }

    return true
}

// 이번 빌드에서 변경된 파일 목록을 계산합니다. 판단이 불가능하면 null을 반환해 전체 빌드로 진행합니다(fail-open).
List<String> resolveChangedFiles(Map<String, String> ctx) {
    try {
        String diffOutput
        if (ctx.isPullRequest == 'true' && env.CHANGE_TARGET?.trim()) {
            // PR 빌드: 대상 브랜치와의 merge-base 기준으로 PR이 실제 건드린 파일만 계산합니다.
            String target = env.CHANGE_TARGET.trim()
            sh "git fetch --no-tags origin +refs/heads/${target}:refs/remotes/origin/${target}"
            diffOutput = sh(returnStdout: true, script: "git diff --name-only origin/${target}...HEAD").trim()
        } else if (env.GIT_PREVIOUS_SUCCESSFUL_COMMIT?.trim()) {
            // 브랜치 빌드: 이 잡의 마지막 성공 빌드 이후 변경분만 계산합니다.
            String previous = env.GIT_PREVIOUS_SUCCESSFUL_COMMIT.trim()
            int exists = sh(returnStatus: true, script: "git cat-file -e ${previous}^{commit}")
            if (exists != 0) {
                echo "이전 성공 커밋(${previous})을 찾을 수 없어 전체 빌드로 진행합니다."
                return null
            }
            diffOutput = sh(returnStdout: true, script: "git diff --name-only ${previous} HEAD").trim()
        } else {
            echo '변경 파일 기준 커밋을 판단할 수 없어 전체 빌드로 진행합니다. (첫 빌드 등)'
            return null
        }
        return diffOutput ? diffOutput.split('\n').collect { it.trim() }.findAll { it } : []
    } catch (Exception e) {
        echo "변경 파일 계산에 실패해 전체 빌드로 진행합니다: ${e.message}"
        return null
    }
}

// 변경 파일이 이 서비스 빌드에 영향을 주는지 판단합니다.
// 자기 서비스 경로 또는 공용 경로(core 모듈, gradle 루트 설정, 파이프라인 정의) 변경 시에만 빌드합니다.
boolean isServiceAffected(Map<String, String> config, List<String> changedFiles) {
    if (changedFiles == null) {
        return true
    }
    if (changedFiles.isEmpty()) {
        echo '변경 파일이 없어 빌드/배포를 건너뜁니다.'
        return false
    }

    List<String> sharedPrefixes = [
        'backend/core/',
        'backend/build.gradle',
        'backend/settings.gradle',
        'backend/gradle',
        'Jenkinsfile'
    ]
    String servicePrefix = "${config.fsPath}/"

    List<String> matched = changedFiles.findAll { path ->
        path.startsWith(servicePrefix) || sharedPrefixes.any { prefix -> path.startsWith(prefix) }
    }

    if (matched) {
        echo "이 서비스에 영향 있는 변경 ${matched.size()}건: ${matched.take(10).join(', ')}${matched.size() > 10 ? ' ...' : ''}"
        return true
    }

    echo "변경 파일 ${changedFiles.size()}건 중 ${config.serviceName} 관련 변경이 없어 빌드/배포를 건너뜁니다."
    return false
}

String resolveVaultApiPath(String vaultSecretPath, Integer engineVersion) {
    if (engineVersion != 2) {
        return vaultSecretPath
    }

    List<String> parts = vaultSecretPath.tokenize('/')
    if (parts.size() < 2) {
        error "Vault KV v2 path must include mount and secret path: ${vaultSecretPath}"
    }

    String mountPath = parts.first()
    String secretPath = parts.drop(1).join('/')
    return "${mountPath}/data/${secretPath}"
}

Map<String, String> readVaultSecretValues(Map<String, Object> vaultSpec) {
    String vaultAddr = params.VAULT_ADDR?.trim()
    String roleIdCredentialId = params.VAULT_ROLE_ID_CREDENTIAL_ID?.trim()
    String secretIdCredentialId = params.VAULT_SECRET_ID_CREDENTIAL_ID?.trim()
    String authPath = params.VAULT_AUTH_PATH?.trim() ?: 'approle'

    if (!vaultAddr) {
        error 'VAULT_ADDR is required.'
    }
    if (!roleIdCredentialId || !secretIdCredentialId) {
        error 'VAULT_ROLE_ID_CREDENTIAL_ID and VAULT_SECRET_ID_CREDENTIAL_ID are required.'
    }

    String normalizedVaultAddr = vaultAddr.replaceAll('/+$', '')
    String loginResponse = ''

    // 배포 agent가 KV 전체 secret을 읽을 수 있도록 AppRole로 로그인합니다.
    withCredentials([
        string(credentialsId: roleIdCredentialId, variable: 'VAULT_ROLE_ID'),
        string(credentialsId: secretIdCredentialId, variable: 'VAULT_SECRET_ID')
    ]) {
        withEnv([
            "VAULT_ADDR=${normalizedVaultAddr}",
            "VAULT_AUTH_PATH=${authPath}"
        ]) {
            loginResponse = sh(
                returnStdout: true,
                script: '''#!/usr/bin/env bash
set +x
set -euo pipefail

login_payload=$(printf '{"role_id":"%s","secret_id":"%s"}' "$VAULT_ROLE_ID" "$VAULT_SECRET_ID")
curl --fail --silent --show-error \
  --request POST \
  --data "$login_payload" \
  "$VAULT_ADDR/v1/auth/$VAULT_AUTH_PATH/login"
'''
            ).trim()
        }
    }

    // Vault 로그인 응답에서 이후 조회에 사용할 client_token만 꺼냅니다.
    def loginPayload = readJSON text: loginResponse
    String clientToken = loginPayload?.auth?.client_token?.toString()
    if (!clientToken) {
        error 'Vault AppRole login did not return client_token.'
    }

    String secretResponse = ''
    // Jenkinsfile에 key 목록을 두지 않고 secret path 전체를 읽습니다.
    withEnv([
        "VAULT_ADDR=${normalizedVaultAddr}",
        "VAULT_CLIENT_TOKEN=${clientToken}",
        "VAULT_API_PATH=${vaultSpec.apiPath}"
    ]) {
        secretResponse = sh(
            returnStdout: true,
            script: '''#!/usr/bin/env bash
set +x
set -euo pipefail

curl --fail --silent --show-error \
  --header "X-Vault-Token: $VAULT_CLIENT_TOKEN" \
  "$VAULT_ADDR/v1/$VAULT_API_PATH"
'''
        ).trim()
    }

    // KV v2 응답은 data.data 아래에 실제 환경변수 key-value가 들어 있습니다.
    def secretPayload = readJSON text: secretResponse
    def rawSecretValues = [:]
    if (vaultSpec.engineVersion == 2) {
        rawSecretValues = secretPayload?.data?.data as Map
    } else {
        rawSecretValues = secretPayload?.data as Map
    }

    if (!rawSecretValues) {
        error "Vault secret has no key-value data: ${vaultSpec.path}"
    }

    Map<String, String> secretValues = [:]
    rawSecretValues.each { key, value ->
        // Docker Compose --env-file이 읽을 수 있는 KEY=value 형식만 허용합니다.
        String envKey = key.toString()
        if (!(envKey ==~ /[A-Za-z_][A-Za-z0-9_]*/)) {
            error "Vault key is not a valid env var name: ${envKey}"
        }

        String envValue = value == null ? '' : value.toString()
        if (envValue.contains('\n') || envValue.contains('\r')) {
            error "Vault value for ${envKey} contains a newline and cannot be rendered as a simple .env entry."
        }

        secretValues[envKey] = envValue
    }

    return secretValues
}

String renderEnvFile(Map<String, String> secretValues) {
    // 매번 같은 .env.runtime이 생성되도록 key를 정렬해서 렌더링합니다.
    return secretValues
        .keySet()
        .sort()
        .collect { key -> "${key}=${secretValues[key]}" }
        .join('\n') + '\n'
}

List<String> renderEnvBindings(Map<String, String> secretValues) {
    return secretValues
        .keySet()
        .sort()
        .collect { key -> "${key}=${secretValues[key]}" }
}

List<String> requiredBuildEnvKeys() {
    return [
        'SPRING_PROFILES_ACTIVE',
        'JASYPT_ENCRYPTOR_KEY'
    ]
}

void validateRequiredEnvValues(String vaultPath, Map<String, String> envValues, List<String> requiredKeys) {
    List<String> missingKeys = requiredKeys.findAll { key -> !envValues[key]?.trim() }

    if (missingKeys) {
        error "Vault secret ${vaultPath} is missing required key(s): ${missingKeys.join(', ')}"
    }
}

Map<String, String> readBuildEnvValues(Map<String, Object> config, Map<String, String> ctx) {
    if (!(ctx.deployEnv in ['dev', 'prod'])) {
        return [:]
    }

    Map<String, Object> vaultSpec = resolveVaultSpec(config, ctx)
    Map<String, String> vaultValues = readVaultSecretValues(vaultSpec)
    validateRequiredEnvValues(vaultSpec.path as String, vaultValues, requiredBuildEnvKeys())

    return vaultValues
}

void run(Map<String, String> config) {
    properties([
        buildDiscarder(logRotator(numToKeepStr: '20')),
        disableConcurrentBuilds(),
        parameters([
            string(
                name: 'TARGET_BRANCH',
                defaultValue: '',
                description: '배포 환경을 판별할 대상 브랜치입니다. 비워두면 CHANGE_TARGET 또는 BRANCH_NAME을 사용합니다.'
            ),
            string(
                name: 'PR_SHA',
                defaultValue: '',
                description: '체크아웃할 커밋 SHA입니다. 비워두면 멀티브랜치 기본 체크아웃을 사용합니다.'
            ),
            string(
                name: 'PR_NUMBER',
                defaultValue: '',
                description: '표시와 로그 확인용 PR 번호입니다. 선택 입력입니다.'
            ),
            booleanParam(
                name: 'RUN_TESTS',
                defaultValue: true,
                description: 'bootJar 전에 대상 모듈 테스트를 실행할지 여부입니다.'
            ),
            booleanParam(
                name: 'SKIP_DEPLOY',
                defaultValue: false,
                description: '배포 가능한 브랜치여도 배포를 건너뛰고 빌드만 수행합니다.'
            ),
            string(
                name: 'DEPLOY_BASE_PARENT',
                defaultValue: 'deploy',
                description: '배포 서버의 사용자 홈 아래에 둘 최상위 디렉터리명입니다.'
            ),
            string(
                name: 'PROJECT_SLUG',
                defaultValue: 'bosspickseoul',
                description: '배포 디렉터리와 Vault 경로에 사용할 프로젝트 식별자입니다.'
            ),
            string(
                name: 'DEPLOY_APP_DIR',
                defaultValue: 'backend',
                description: '프로젝트 배포 디렉터리 아래의 애플리케이션 루트 디렉터리명입니다.'
            ),
            string(
                name: 'VAULT_ADDR',
                defaultValue: 'https://vault.8llow8llowme.com',
                description: 'Vault API 주소입니다.'
            ),
            string(
                name: 'VAULT_AUTH_PATH',
                defaultValue: 'approle',
                description: 'Vault AppRole 인증 mount path입니다.'
            ),
            string(
                name: 'VAULT_ROLE_ID_CREDENTIAL_ID',
                defaultValue: 'bosspickseoul-vault-role-id',
                description: 'Vault AppRole role_id를 담은 Jenkins Secret text Credential ID입니다.'
            ),
            string(
                name: 'VAULT_SECRET_ID_CREDENTIAL_ID',
                defaultValue: 'bosspickseoul-vault-secret-id',
                description: 'Vault AppRole secret_id를 담은 Jenkins Secret text Credential ID입니다.'
            ),
            string(
                name: 'VAULT_SECRET_ROOT',
                defaultValue: '',
                description: 'Vault KV secret 공통 루트입니다. 비워두면 kv/${PROJECT_SLUG}/backend를 사용하고 {root}/{env}/env를 조회합니다.'
            ),
            string(
                name: 'VAULT_SECRET_PATH',
                defaultValue: '',
                description: 'Vault secret 전체 경로입니다. 입력하면 VAULT_SECRET_ROOT보다 우선합니다.'
            ),
            string(
                name: 'VAULT_ENGINE_VERSION',
                defaultValue: '2',
                description: 'HashiCorp Vault KV 엔진 버전입니다.'
            ),
            string(
                name: 'DEPLOY_LOCK_NAME',
                defaultValue: 'backend-1-deploy',
                description: '백엔드 배포를 직렬화할 때 사용할 Lockable Resource 이름입니다.'
            )
        ])
    ])

    Map<String, String> ctx = [:]

    stage('배포 문맥 확인') {
        node(config.buildAgentLabel) {
            try {
                deleteDir()
                checkoutSource()
                ctx = resolveGitContext()

                // 모노레포에서 잡 8개가 같은 push에 전부 트리거되므로,
                // 이 서비스와 무관한 변경이면 빌드/배포를 건너뛴다.
                List<String> changedFiles = resolveChangedFiles(ctx)
                ctx.serviceAffected = isServiceAffected(config, changedFiles) ? 'true' : 'false'

                currentBuild.displayName = "#${env.BUILD_NUMBER} ${config.serviceName} ${env.BRANCH_NAME ?: 'n/a'}"

                echo '=== 빌드 문맥 ==='
                echo "현재 브랜치: ${env.BRANCH_NAME ?: '없음'}"
                echo "서비스 그룹: ${config.serviceGroup}"
                echo "서비스 이름: ${config.serviceName}"
                echo "요청 대상 브랜치: ${ctx.requestedTargetBranch ?: '없음'}"
                echo "적용 대상 브랜치: ${ctx.effectiveTargetBranch ?: '없음'}"
                echo "PR SHA: ${ctx.requestedPrSha ?: '없음'}"
                echo "PR 번호: ${ctx.requestedPrNumber ?: '없음'}"
                echo "PR 빌드 여부: ${ctx.isPullRequest}"
                echo "서비스 영향 여부: ${ctx.serviceAffected}"
                echo "배포 환경: ${ctx.deployEnv}"
                echo "빌드 에이전트 라벨: ${config.buildAgentLabel}"
                if (ctx.deployEnv in ['dev', 'prod']) {
                    echo "배포 에이전트 라벨: ${resolveDeployAgentLabel(config, ctx)}"
                }
                echo "배포 경로 규칙: \$HOME/${params.DEPLOY_BASE_PARENT}/${params.PROJECT_SLUG}/${params.DEPLOY_APP_DIR}/..."
                if (ctx.deployEnv in ['dev', 'prod']) {
                    String resolvedVaultRoot = params.VAULT_SECRET_ROOT?.trim() ?: "kv/${params.PROJECT_SLUG}/backend"
                    String resolvedVaultPath = params.VAULT_SECRET_PATH?.trim() ?: "${resolvedVaultRoot}/${ctx.deployEnv}/env"
                    echo "Vault secret path: ${resolvedVaultPath}"
                }
                echo '================='
            } finally {
                deleteDir()
            }
        }
    }

    if (ctx.serviceAffected == 'false') {
        stage('변경 없음 - 생략') {
            echo "이번 변경은 ${config.serviceName}에 영향이 없어 빌드/배포를 건너뜁니다."
            currentBuild.description = '변경 없음 - 빌드/배포 생략'
        }
        return
    }

    stage('JAR 빌드') {
        node(config.buildAgentLabel) {
            try {
                deleteDir()
                checkoutSource()

                Map<String, String> buildEnvValues = readBuildEnvValues(config, ctx)

                withEnv(renderEnvBindings(buildEnvValues)) {
                    dir('backend') {
                        sh 'chmod +x gradlew'

                        String gradleCommand = params.RUN_TESTS
                            ? "./gradlew :${config.modulePath}:test :${config.modulePath}:bootJar --no-daemon --parallel --build-cache --stacktrace"
                            : "./gradlew :${config.modulePath}:bootJar --no-daemon --parallel --build-cache --stacktrace"

                        sh """#!/usr/bin/env bash
set -euo pipefail
${gradleCommand}
"""
                    }
                }

                archiveArtifacts artifacts: "${config.fsPath}/build/libs/*.jar", fingerprint: true
                stash(
                    name: "bundle-${config.serviceName}",
                    includes: "${config.fsPath}/build/libs/*.jar,${config.fsPath}/${config.dockerfile},${config.fsPath}/${config.composeFile}"
                )
            } finally {
                deleteDir()
            }
        }
    }

    boolean shouldDeploy = shouldDeployToEnvironment(ctx)

    if (shouldDeploy) {
        stage("${ctx.deployEnv} 환경 배포") {
            lock(resource: params.DEPLOY_LOCK_NAME?.trim() ?: 'backend-1-deploy') {
                node(resolveDeployAgentLabel(config, ctx)) {
                    try {
                        deleteDir()
                        unstash "bundle-${config.serviceName}"

                        Map<String, Object> vaultSpec = resolveVaultSpec(config, ctx)
                        Map<String, String> vaultValues = readVaultSecretValues(vaultSpec)
                        writeFile file: '.env.runtime', text: renderEnvFile(vaultValues)

                        sh """#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="\${HOME}/${params.DEPLOY_BASE_PARENT}/${params.PROJECT_SLUG}/${params.DEPLOY_APP_DIR}/${config.deploySubdir}"
mkdir -p "\${SERVICE_DIR}"
rsync -a --delete "${config.fsPath}/" "\${SERVICE_DIR}/"
install -m 600 .env.runtime "\${SERVICE_DIR}/.env.runtime"

jar_file="\$(find "\${SERVICE_DIR}/build/libs" -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | sort | head -n 1)"
if [ -z "\${jar_file}" ]; then
  jar_file="\$(find "\${SERVICE_DIR}/build/libs" -maxdepth 1 -type f -name '*.jar' | sort | head -n 1)"
fi
if [ -z "\${jar_file}" ]; then
  echo "배포할 JAR 파일을 찾지 못했습니다: \${SERVICE_DIR}/build/libs"
  find "\${SERVICE_DIR}" -maxdepth 4 -type f | sort
  exit 1
fi
install -m 644 "\${jar_file}" "\${SERVICE_DIR}/app.jar"

docker network inspect 8llow8llowme-net >/dev/null 2>&1 || docker network create 8llow8llowme-net >/dev/null

cd "\${SERVICE_DIR}"
test -s .env.runtime
test -s app.jar

service_env_prefix="\$(printf '%s' '${config.serviceName}' | tr '[:lower:]-' '[:upper:]_')"
required_runtime_keys="TIME_ZONE SPRING_PROFILES_ACTIVE \${service_env_prefix}_APP_NAME \${service_env_prefix}_PORT \${service_env_prefix}_PORT_${ctx.deployEnv.toUpperCase()}"
echo "Runtime env key check:"
for required_key in \${required_runtime_keys}; do
  if grep -q "^\${required_key}=" .env.runtime; then
    echo "  \${required_key}=<set>"
  else
    echo "  \${required_key}=<missing>"
    exit 1
  fi
done

docker compose --env-file .env.runtime -f ${config.composeFile} config >/dev/null
docker compose --env-file .env.runtime -f ${config.composeFile} up -d --build --remove-orphans ${config.composeServiceName}-${ctx.deployEnv}

for attempt in \$(seq 1 30); do
  state="\$(docker inspect -f '{{.State.Status}}' ${config.containerNamePrefix}-${ctx.deployEnv} 2>/dev/null || true)"

  if [ "\${state}" = "running" ]; then
    docker compose --env-file .env.runtime -f ${config.composeFile} ps ${config.composeServiceName}-${ctx.deployEnv}
    exit 0
  fi

  if [ "\${state}" = "exited" ] || [ "\${state}" = "dead" ]; then
    docker logs --tail 200 ${config.containerNamePrefix}-${ctx.deployEnv} || true
    exit 1
  fi

  sleep 5
done

docker logs --tail 200 ${config.containerNamePrefix}-${ctx.deployEnv} || true
exit 1
"""
                    } finally {
                        deleteDir()
                    }
                }
            }
        }
    } else {
        stage('배포 생략') {
            echo "배포를 생략합니다. deployEnv=${ctx.deployEnv}, skipDeploy=${params.SKIP_DEPLOY}, isPullRequest=${ctx.isPullRequest}"
        }
    }
}

return this
