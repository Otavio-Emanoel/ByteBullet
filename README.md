# ByteBullet

ByteBullet é um protótipo de FPS mobile construído 100% em código usando Babylon.js, TypeScript, Vite e Capacitor.

## Pré-requisitos

- Node.js 18+
- npm 9+

## Scripts

```bash
npm run dev      # Ambiente de desenvolvimento com Vite
npm run build    # Build de produção para a pasta dist
npm run preview  # Servir o build localmente
```

## Próximos passos com Capacitor

1. Gere o build web: `npm run build`.
2. Sincronize plataformas: `npx cap sync`.
3. Abra o projeto nativo desejado:
   - Android: `npx cap open android`
   - iOS: `npx cap open ios`

Toda a cena 3D inicial é configurada em `src/game.ts`, mantendo o fluxo 100% orientado a código.
