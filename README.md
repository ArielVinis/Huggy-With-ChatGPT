# Resumo do Código

Este código implementa uma função de webhook que integra o serviço Huggy com a API do ChatGPT para gerenciar mensagens de atendimento. A estrutura principal realiza as seguintes funções:

1. **doPost**: Recebe eventos do webhook da Huggy e verifica se há uma nova mensagem recebida. Caso positivo, chama a função `manageCalls` para processar a mensagem e determinar a resposta adequada.

2. **manageCalls**:
   - Verifica se o chat contém uma variável de contexto vinculada ao fluxo mapeado para o ChatGPT, utilizando a função `variablesChecker`.
   - Se o fluxo estiver mapeado, faz uma chamada para a API do ChatGPT, enviando a mensagem recebida como prompt.
   - A resposta do ChatGPT é então adicionada ao chat via a função `addMessageInChat`.
   - Por fim, chama `triggerFlowMenu` para enviar ao usuário um menu com opções adicionais, possibilitando continuar a interação ou finalizar a conversa.

3. **variablesChecker**: Confere se o chat contém uma variável de contexto específica (`experimentar_gpt`) que indica um fluxo que permite o uso do ChatGPT. Retorna `true` se a variável é encontrada e `false` caso contrário.

4. **addMessageInChat**: Envia a resposta gerada pelo ChatGPT para o chat da Huggy.

5. **triggerFlowMenu**: Aciona um fluxo de opções adicionais no chat após a resposta do ChatGPT.

6. **Funções Auxiliares**:
   - `extractMessage`: Extrai o conteúdo da resposta do ChatGPT a partir do JSON retornado.
   - `returnStatus`: Retorna o status da execução em formato JSON, com uma mensagem e um timestamp.

O código usa `axios` para realizar requisições HTTP para a API do ChatGPT e para a API da Huggy, e o controle de variáveis e autenticação é gerido com `process.env` para segurança.
