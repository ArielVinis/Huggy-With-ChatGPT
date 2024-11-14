const functions = require('@google-cloud/functions-framework');
const axios = require('axios');
const gptToken = process.env.GPT_TOKEN;
const huggyApiToken = process.env.HUGGY_TOKEN;
const companyId = process.env.COMPANY_ID;
const flowId = process.env.FLOW_ID;

/* doPost:
- Recebe os eventos do Webhook da Huggy e verifica se é um evento de mensagem recebida (receivedMessage).
- Chama a função 'manageCalls'para gerenciar as chamadas para o chat GPT e para a Huggy.
*/

exports.doPost = async (req, res) => {
  const requestData = req.body;

  if (requestData.messages && requestData.messages.receivedMessage) {
    requestData.messages.receivedMessage.forEach(message => {
      const stepsDone = manageCalls(message.body, message.chat.id);
      stepsDone === false ? res.json(returnStatus('O chat não pertence a um flow mapeado, ou algum processo falhou.')) : res.json(returnStatus('Sucesso na execução.'));
    });
  }
};

/* manageCalls:
- Chama a função 'variablesChecker', para saber se a mensagem do chat contém uma variável de contexto relativa ao fluxo mapeado. Caso a variável for identificada, aciona a API do Chat GPT enviando a mensagem como prompt.
- Recebe o retorno do ChatGPT com a resposta e faz a chamada para a API da Huggy, que vai disparar no chat a resposta que veio do GPT.
- Após disparar a mensagem no chat, chama a API da Huggy para executar o flow contendo o menu com mais opções (permitindo continuar interagindo com o ChatGPT ou finalizando a conversa).
- Se todos passos acima forem executados é retornado 'true', caso contrário é retornado 'false'.
 */

async function manageCalls(chatMessage, chatId) {
  const monitoredFlow = await variablesChecker(chatId);
  const url = 'https://api.openai.com/v1/chat/completions';
  const gptModel = 'gpt-3.5-turbo';
  const gptHeaders = {Authorization: `Bearer ${gptToken}`, 'Content-Type': 'application/json'}
  
  if (monitoredFlow === true) {
    const body = {
      model: gptModel,
      messages: [
        {
          role: 'system',
          content: 'Você é um profissional com anos de prática em atendimento ao cliente e é formado em Customer Success, é atencioso, empático, com respostas objetivas e rápidas.'
        },
        {
          role: 'user',
          content: chatMessage
        }
      ],
    };
    try {
      const response = await axios.post(url, body, {headers: gptHeaders});
      let allStepsPerformed = true;
      const messageAdded = await addMessageInChat(extractMessage(JSON.stringify(response.data)), chatId);
      const flowTriggered = await triggerFlowMenu(chatId, flowId);

      messageAdded === false || flowTriggered === false? allStepsPerformed = false: allStepsPerformed = true;

      return (allStepsPerformed);
    } catch (error) {
      console.error('Error calling GPT:', error.message);
      return false;
    }
  } else {
    console.log('Nenhuma operação será realizada, pois o flow não está mapeado.');
    return false;
  }
}

/*variablesChecker:
Verifica se o chat possui uma variável de contexto correspondente ao flow que interage com o ChatGPT. Essa variável está presente no flow chamado de 'ChatGPT | Use como Flow de entrada'.
Detalhes em https://developers.huggy.io/pt/API/api-v3.html#get-chats-id-contextvariables
*/
async function variablesChecker(chatId) {
  try {
    const response = await axios.get(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/contextVariables`,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { contextVariables } = response.data;
    
    if (contextVariables.experimentar_gpt === 'Testar o ChatGPT') {// 'experimentar_gpt' é uma variável de contexto e 'Testar o ChatGPT' é o valor dela preenchido na alão Enviar pergunta
      return true;

    } else {
      return false;
    }
   
  } catch (error) {
    console.error('erro:', error.message);
    return false;
  }
}

/* addMessageInChat:
Adiciona a resposta do ChatGPT como mensagem no chat da Huggy. Detalhes em: https://developers.huggy.io/pt/API/api-v3.html#post-chats-id-messages
*/
async function addMessageInChat(chatMessage, chatId) {
  const data = {
    text: chatMessage
  };

  try {
    const response = await axios.post(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/messages/`,
      data,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error) {

    console.error('Error sending message:', error.message);
    return false;
  }
}

/* triggerFlowMenu:
Dispara o flow de opções adicionais na conversa. É chamada logo após a mensagem do GPT ser disparada. Detalhes em: https://developers.huggy.io/pt/API/api-v3.html#post-chats-id-flow
*/
async function triggerFlowMenu(chatId, flowId) {
  let data = {
    "flowId": flowId
  };

  try {
    const response = await axios.post(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/flow/`,
      data,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error triggering flow:', error.message);
    return false;
  }
}

function extractMessage(jsonString) {
  const data = JSON.parse(jsonString);
  const message = data.choices[0].message;
  return message.content;
}

function returnStatus(message) {
  const responseData = {
    status: message,
    timestamp: Date.now()
  };
  return responseData;
}