import { defineConfig } from 'cypress'
import createBundler from '@bahmutov/cypress-esbuild-preprocessor'
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor'
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild'

export default defineConfig({
  e2e: {
    baseUrl: process.env.SUT_URL ?? 'http://127.0.0.1:8011',
    specPattern: 'cypress/e2e/**/*.feature',
    viewportWidth: 1366,
    viewportHeight: 900,
    defaultCommandTimeout: 6000,
    video: false,
    // Sem novas tentativas: um teste instável é tratado como defeito do próprio teste.
    retries: 0,
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config)
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }))
      return config
    },
  },
})
