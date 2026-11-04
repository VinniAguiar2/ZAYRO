# ZAYRO — aplicação com integração de IA

A ZAYRO é uma aplicação web responsiva para pequenos negócios. O projeto inclui interface para iPhone e servidor Node.js que chama a API da OpenAI.

## Funções incluídas
- Geração de três opções de anúncios em português brasileiro.
- Geração de imagem publicitária original do zero.
- Geração de proposta de logotipo para a marca.
- Download das imagens em PNG e cópia dos anúncios.
- Limite básico de requisições por IP e cabeçalhos de segurança.

## O que falta para ficar acessível pela internet
Este pacote contém o código e a integração, mas não está publicado nem conectado à sua conta. Para funcionar online, é necessário publicar o servidor e cadastrar uma chave da API como variável secreta no serviço de hospedagem. A chave nunca deve ser colocada no HTML, no GitHub ou enviada pelo chat.

A cobrança da API é separada da assinatura do ChatGPT. Confira os preços e configure um limite de gastos na plataforma antes de liberar o uso para clientes.

## Publicação sugerida: GitHub + Render
1. Extraia esta pasta e envie os arquivos para um repositório privado no GitHub.
2. Na Render, crie um serviço do tipo **Web Service** e conecte o repositório.
3. Build command: `npm install`
4. Start command: `npm start`
5. Em **Environment**, cadastre `OPENAI_API_KEY` com a chave secreta criada na OpenAI Platform. Opcionalmente, os modelos podem ser ajustados por `OPENAI_TEXT_MODEL` e `OPENAI_IMAGE_MODEL`.
6. Publique e abra a URL fornecida pela Render no Safari do iPhone. Use Compartilhar → Adicionar à Tela de Início.

## Execução local (computador)
Requer Node.js 20 ou superior.
1. Abra o terminal nesta pasta.
2. Execute `npm install`.
3. Configure `OPENAI_API_KEY` no ambiente do terminal.
4. Execute `npm start` e abra `http://localhost:3000`.

## Modelos configurados
- Texto: `gpt-6-astra` via Responses API.
- Imagem: `gpt-image-2.5-flare` via Images API.

A disponibilidade e o acesso aos modelos dependem do projeto/organização da API. A geração só poderá ser testada de ponta a ponta depois que a chave válida estiver configurada no servidor.
