// Prepara e inicia o sistema sob teste (SUT): o ServiceDesk, em uma versão fixa.
//
//   node scripts/sut.mjs prepare   clona a versão fixada, instala dependências e compila o React
//   node scripts/sut.mjs start     inicia a API (que também serve a interface) com banco limpo
//
// Variáveis opcionais:
//   SUT_REF   commit/branch do ServiceDesk a testar (padrão: versão fixada abaixo)
//   SUT_DIR   usar uma cópia local já existente em vez de clonar (ex.: ../service-desk)
//   SUT_PORT  porta da aplicação (padrão: 8011)
//   PYTHON    interpretador usado para criar o ambiente virtual (padrão: python/python3)
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO = 'https://github.com/JVCSampaio/service-desk.git'
const REF = process.env.SUT_REF || '520888b0b6e6150b43b35c27cd4a03503ec73733'
const DIR = resolve(process.env.SUT_DIR || '.sut/service-desk')
const PORT = process.env.SUT_PORT || '8011'
const windows = process.platform === 'win32'
const python = join(DIR, '.venv', windows ? 'Scripts/python.exe' : 'bin/python')

function run(command, args, options = {}) {
  // No Windows o npm é um .cmd e só roda via shell; os argumentos usados aqui não têm espaços.
  const result =
    windows && command === 'npm'
      ? spawnSync([command, ...args].join(' '), { stdio: 'inherit', shell: true, ...options })
      : spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    console.error(`[sut] Falhou: ${command} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

function prepare() {
  if (!process.env.SUT_DIR) {
    if (!existsSync(join(DIR, '.git'))) run('git', ['clone', '--quiet', REPO, DIR])
    run('git', ['-C', DIR, 'fetch', '--quiet', 'origin'])
    // Aceita commit ou branch; branch sempre na versão mais recente do remoto.
    const remoto = spawnSync('git', ['-C', DIR, 'rev-parse', '--verify', '--quiet', `origin/${REF}`])
    run('git', ['-C', DIR, 'checkout', '--quiet', '--detach', remoto.status === 0 ? `origin/${REF}` : REF])
  }
  if (!existsSync(python)) {
    run(process.env.PYTHON || (windows ? 'python' : 'python3'), ['-m', 'venv', join(DIR, '.venv')])
  }
  const pip = ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check']
  run(python, [...pip, '-r', join(DIR, 'requirements.txt')])
  run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: join(DIR, 'web') })
  run('npm', ['run', 'build'], { cwd: join(DIR, 'web') })
  console.log(`[sut] ServiceDesk pronto em ${DIR}`)
}

function start() {
  if (!existsSync(python)) {
    console.error('[sut] Ambiente não preparado. Rode antes: npm run sut:prepare')
    process.exit(1)
  }
  // Cada execução começa com um banco novo, contendo só os seis chamados de demonstração.
  const db = join(DIR, '.data', 'qa.db')
  for (const suffix of ['', '-wal', '-shm']) rmSync(db + suffix, { force: true })
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', PORT, '--no-access-log']
  const server = spawn(python, args, { cwd: DIR, stdio: 'inherit', env: { ...process.env, APP_DB: db } })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
  server.on('exit', (code) => process.exit(code ?? 0))
}

const commands = { prepare, start }
const command = commands[process.argv[2]]
if (!command) {
  console.error('Uso: node scripts/sut.mjs <prepare|start>')
  process.exit(1)
}
command()
