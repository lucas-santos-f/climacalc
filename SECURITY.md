# Política de segurança — ClimaCalc

## Modelo

- Aplicação 100 % estática (SPA) servida pelo Cloudflare Workers Static Assets. Não há backend, banco de dados, autenticação nem coleta de dados.
- Os cenários do usuário ficam apenas no `localStorage` do navegador (`climacalc:v1`). Links de compartilhamento carregam o cenário comprimido no fragmento da URL (`#s=`), que nunca é enviado ao servidor.

## Controles

| Camada | Controle |
| --- | --- |
| Cabeçalhos HTTP (`public\_headers`) | `Content-Security-Policy` estrita (`default-src 'none'`, `script-src 'self'`, sem `unsafe-eval`/`unsafe-inline` em scripts), `Strict-Transport-Security` com preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restritiva, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy`. |
| Validação de entrada | Todo JSON importado, link `#s=` e conteúdo do `localStorage` passa por esquemas Zod (`src\state\schema.ts`) com tipos, enumerações e limites numéricos; tamanho máximo de importação 256 kB; nomes de arquivo sanitizados. |
| Dependências | `npm audit` no CI, Dependabot mensal e agrupado (npm e GitHub Actions), lockfile versionado. |
| Código | ESLint 9 + TypeScript estrito; CodeQL (JavaScript/TypeScript); gitleaks para segredos. |
| Segredos | Nenhum segredo no repositório. Tokens de deploy ficam apenas em *GitHub Secrets* / Cloudflare. `.env*` ignorado pelo Git. |
| Publicação | Deploy manual (`npm run deploy`) ou GitHub Actions com `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` e variável `CF_DEPLOY_ENABLED=true`. |

## Relato de vulnerabilidades

Abra uma *issue* privada (GitHub → Security → Report a vulnerability) deste projeto ou contate o autor pelo GitHub. Não divulgue publicamente antes da correção.
