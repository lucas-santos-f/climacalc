# ClimaCalc

Calculadora visual de **carga térmica, psicrometria e seleção de equipamento de ar-condicionado** para conforto: escritórios, salas de reunião, salas de aula, academias, residências, lojas, restaurantes, hotéis, quartos hospitalares, auditórios e salas técnicas.

Fork do FrigoCalc (refrigeração comercial/industrial) com o mesmo motor termodinâmico, mas voltado para climatização de ambientes ocupados.

- **Site:** fora do ar (só será publicado em domínio neutro, sem nome do autor)
- 100 % no navegador — nenhum dado sai do dispositivo; cenários ficam no armazenamento local e podem ser compartilhados por link, JSON ou CSV.
- Português / inglês, unidades SI / IP, tema claro / escuro, impressão em PDF.

## O que calcula

| Aba | Conteúdo |
| --- | --- |
| **Ambiente & carga** | Local e condições de projeto (15 capitais + personalizado), geometria, fachadas e vidros por orientação (U, massa, cor, SHGC, proteção solar), cobertura e piso, ocupação por atividade, iluminação, equipamentos, ar externo (NBR 16401-3), infiltração, ventiladores, fator de segurança. Resultado em kW / TR / BTU/h, sensível × latente, SHR, W/m², m²/TR, gráficos e tabela detalhada. |
| **Ar & psicrometria** | Vazão de insuflamento, renovações/h, fração de ar externo, estado do ar insuflado, mistura, ADP e fator de bypass, carta psicrométrica interativa com os pontos OA / RA / MA / SA / ADP. |
| **Equipamento** | Split, VRF, rooftop, chiller a ar ou a água: tamanhos comerciais, unidades N / N+1, COP nominal × COP do ciclo real (CoolProp), demanda elétrica (compressores, ventiladores, bombas, torre, kVA, corrente, transformador), água gelada / condensação / reposição, carga de fluido, CO₂e, limite de carga A2L/A3 em ambiente (IEC 60335-2-40 / NBR 16655), ventilação de emergência, áreas; diagrama p–h; sensibilidade da carga × temperatura externa e × setpoint. |
| **Comparar** | COP, GWP, potência, descarga e deslocamento de 23 fluidos nas condições do sistema; tabela comparativa de todos os cenários salvos. |
| **Método** | Hipóteses, fórmulas, normas e limitações. |

## Método (resumo)

- Carga de resfriamento no instante de projeto pelo método CLTD/SCL/CLF simplificado (ASHRAE Handbook Fundamentals), hemisfério sul; ar externo conforme NBR 16401-3; calor de pessoas por atividade (ASHRAE cap. 18).
- Psicrometria de Hyland–Wexler com correção de pressão pela altitude.
- Propriedades reais de 23 fluidos (CoolProp 8) em tabelas compactas carregadas sob demanda; ciclo de compressão de vapor com eficiências estimadas por tipo de compressor.
- Ferramenta de **pré-dimensionamento**: não substitui projeto executivo (NBR 16401), simulação horária nem seleção em software de fabricante.

## Desenvolvimento

```bash
npm ci
npm run dev        # http://localhost:5174
npm test           # vitest
npm run lint
npm run build      # dist/
npm run deploy     # build + wrangler deploy (Cloudflare Workers Static Assets)
```

Stack: Vite 7, React 19, TypeScript 5.9, ECharts 6, Zustand 5, Zod 4, lz-string, Vitest 3, ESLint 9, wrangler 4.

Regeneração das tabelas de fluidos (opcional, requer Python + CoolProp):

```bash
python tools/gen_tables.py
```

## Segurança e privacidade

- Sem backend, sem cookies, sem rastreamento. Cenários em `localStorage` (`climacalc:v1`).
- Cabeçalhos em `public\_headers`: CSP estrita (`script-src 'self'`, sem `eval`), HSTS, COOP/COEP/CORP, `X-Frame-Options: DENY`, `Permissions-Policy`.
- Toda entrada externa (links `#s=`, JSON importado, `localStorage`) é validada com esquemas Zod com limites numéricos.
- CI: lint, typecheck, testes, build, `npm audit`, gitleaks; CodeQL; Dependabot. Ver `SECURITY.md`.

## Licença

Todos os direitos reservados ao autor — © 2026. Ver `LICENSE`.
