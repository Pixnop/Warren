import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import type { ConfigArray } from 'typescript-eslint'

// https://eslint.org/docs/latest/use/configure/configuration-files
// The explicit ConfigArray annotation is required because tsconfig.node.json
// is a composite project: without it, vue-tsc reports TS2883 (the inferred
// type is not portable / cannot be named).
const config: ConfigArray = defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/coverage/**', '**/public/wasm/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  skipFormatting,
)

export default config
