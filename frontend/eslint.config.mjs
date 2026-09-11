import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**'],
  },
  {
    // eslint-plugin-react-hooks 7.1 이 새로 켠 규칙을 기존 두 파일이 위반한다.
    // 지도 SDK 로딩 흐름을 손봐야 풀리므로 의존성 보안 갱신과 분리해 별도 PR 에서
    // 고친다. 새 코드에는 규칙이 그대로 적용된다.
    files: ['src/components/recommend/recommend-map.tsx'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
