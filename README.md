# Notificações do PC

App web (um arquivo, `index.html`) que recebe no celular Android, por
**Bluetooth Low Energy**, as notificações enviadas pelo notebook. Funciona
no Chrome do Android pela Web Bluetooth API; iPhone não é suportado (o iOS
não implementa Web Bluetooth).

O notebook precisa estar rodando o servidor BLE (`servidor_ble.py`), que é
distribuído à parte.

## Publicar no GitHub Pages

1. Crie um repositório **público** no GitHub e envie este projeto para ele.
2. *Settings → Pages → Build and deployment*: *Source* = **Deploy from a
   branch**, branch `main`, pasta `/ (root)` → *Save*.
3. Em 1–2 minutos o app fica em `https://<usuario>.github.io/<repositorio>/`.

O Web Bluetooth só funciona em HTTPS, por isso o app precisa do Pages (ou de
outra hospedagem HTTPS); abrir o arquivo direto no celular não funciona.

## Usar

1. No notebook, rode o servidor BLE e espere `anunciando`.
2. No celular, abra o endereço do Pages no Chrome → **Conexão** →
   **Conectar** → escolha o nome do computador.
3. As notificações aparecem na aba **Notificações**, com vibração e som
   configuráveis na aba **Config**.

Dica: menu ⋮ do Chrome → **Adicionar à tela inicial**.
