# Auto update Griffy Store

O sistema usa este fluxo:

1. O app instalado no PC envia a versao instalada para a API.
2. A API le `updates/latest.json`.
3. Se a versao do manifesto for maior, o sistema mostra o botao de atualizar.
4. O botao abre o instalador hospedado no GitHub Releases.

## Configuracao na VPS

No arquivo `/var/www/griffystore/.env`, deixe:

```env
UPDATE_MANIFEST_URL=https://raw.githubusercontent.com/guiiizldev/griffystore/main/updates/latest.json
```

Depois:

```bash
cd /var/www/griffystore
pm2 restart griffystore --update-env
```

## Publicar uma nova versao

No PC de desenvolvimento:

1. Atualize a versao em `package.json`, por exemplo `0.2.1`.
2. Gere o instalador e manifesto:

```powershell
npm run update:release -- -Notes "Melhorias e correcoes"
```

3. Crie uma release no GitHub com a tag da versao, por exemplo `v0.2.1`.
4. Envie o arquivo gerado em `dist\Griffy-Store-Setup-0.2.1.exe` como asset da release.
5. Commit e push do manifesto:

```bash
git add package.json package-lock.json updates/latest.json
git commit -m "Publish update 0.2.1"
git push origin main
```

Com GitHub CLI instalado e logado, o script tambem pode criar/enviar a release:

```powershell
.\scripts\build-update-release.ps1 -Notes "Melhorias e correcoes" -CreateGithubRelease
```

