## Configuração de alertas do Graylog

Para otimizar os alertas dos logs recebidos por meio desta biblioteca, recomendamos a implementação de algumas configurações específicas em relação aos alertas do Graylog:

## Índice
- [Filter & Aggregation](#filter--aggregation)
  - [Filter](#filter)
  - [Aggregation](#aggregation)
- [Habilitar backlog (importante)](#habilitar-backlog-importante)
- [Alertas via Telegram](#alertas-via-telegram)
- [Alertas via e-mail](#alertas-via-e-mail)
  - [Assunto](#assunto)
  - [Corpo do e-mail](#corpo-do-e-mail)

## Filter & Aggregation

### Filter

No campo <i>search query</i> desta seção, é suficiente definirmos com:
```
level: <=5
```
Isso significa que apenas os logs com nível de prioridade 5 (ou menor) serão
considerados para o envio de alertas. Dessa forma, serão ignorados os logs de nível <i>info</i> e <i>debug</i>.

### Aggregation

Recomenda-se utilizar <i>aggregation</i> na filtragem de eventos, com agrupamento dos seguintes campos:

* level
* facility
* app_version
* environment

Dessa forma, os alertas recebidos serão direcionados à respectiva combinação desses campos, permitindo uma análise mais detalhada e isolada.

## Habilitar backlog (importante)

Para receber informações detalhadas dos logs via e-mail ou Telegram, será necessário habilitar o armazenamento de <i>backlog</i> no Graylog, na aba <b><i>notifications</i></b> da seção de configuração de <b><i>event definitions</i></b>.

## Alertas via Telegram

Para configurar os alertas via Telegram, utilize o plugin [**TelegramAlert**](https://github.com/irgendwr/TelegramAlert).

Após configurar o plugin, sugerimos definir o seguinte template JMTE como corpo da mensagem para o Telegram (substituir o valor <i><URL_DO_SERVIDOR_GRAYLOG></i>):

```
${if backlog[0].fields.level = "0"}‼️${end}${if backlog[0].fields.level = "1"}‼️${end}${if backlog[0].fields.level = "2"}‼️${end}${if backlog[0].fields.level = "3"}‼️${end}${if backlog[0].fields.level = "4"}⁉️${end}${if backlog[0].fields.level = "5"}⁉️${end} <code>${backlog.length} ${if backlog[0].fields.level = "0"}${if backlog.length = "1"}emergência${else}emergências${end}${end}${if backlog[0].fields.level = "1"}${if backlog.length = "1"}alerta${else}alertas${end}${end}${if backlog[0].fields.level = "2"}${if backlog.length = "1"}criticidade${else}criticidades${end}${end}${if backlog[0].fields.level = "3"}${if backlog.length = "1"}erro${else}erros${end}${end}${if backlog[0].fields.level = "4"}${if backlog.length = "1"}aviso${else}avisos${end}${end}${if backlog[0].fields.level = "5"}${if backlog.length = "1"}observação${else}observações${end}${end} em ${backlog[0].fields.facility}</code> ${if backlog[0].fields.level = "0"}‼️${end}${if backlog[0].fields.level = "1"}‼️${end}${if backlog[0].fields.level = "2"}‼️${end}${if backlog[0].fields.level = "3"}‼️${end}${if backlog[0].fields.level = "4"}⁉️${end}${if backlog[0].fields.level = "5"}⁉️${end}
Versão: <code>${backlog[0].fields.app_version}</code> | Ambiente: <code>${backlog[0].fields.environment}</code>${if message_too_long}

A mensagem é muito grande para ser exibida. <a href="<URL_DO_SERVIDOR_GRAYLOG>/alerts/${event.id}/replay-search">Clique aqui para ver as ocorrências no Graylog</a>.${else}${if backlog}${foreach backlog message}

============================
⏱️ <code>${message.timestamp} GMT</code>
Host: ${message.source} (<code>${message.fields.gl2_remote_ip}</code>)

MENSAGEM:<pre>${message.message}</pre>${if message.fields.error_message}ERRO:<pre>${message.fields.error_message}</pre>${end}${if message.fields.error_stack}RASTREAMENTO:<pre>${message.fields.error_stack}</pre>${end}${if message.fields.extra_info}INFORMAÇÕES EXTRAS:<pre>${message.fields.extra_info}</pre>${end}${end}${end}${end}
```


## Alertas via e-mail

### Assunto

Podemos incluir informações diretas no assunto do e-mail, configurando o campo <i>subject</i> com o seguinte template JMTE:

```
[Graylog]: ${backlog.length} ${if backlog[0].fields.level = "0"}${if backlog.length = "1"}emergência${else}emergências${end}${end}${if backlog[0].fields.level = "1"}${if backlog.length = "1"}alerta${else}alertas${end}${end}${if backlog[0].fields.level = "2"}${if backlog.length = "1"}criticidade${else}criticidades${end}${end}${if backlog[0].fields.level = "3"}${if backlog.length = "1"}erro${else}erros${end}${end}${if backlog[0].fields.level = "4"}${if backlog.length = "1"}aviso${else}avisos${end}${end}${if backlog[0].fields.level = "5"}${if backlog.length = "1"}observação${else}observações${end}${end} em ${backlog[0].fields.facility} ${backlog[0].fields.app_version} [${backlog[0].fields.environment}]
```

### Corpo do e-mail

O corpo em HTML pode ser estruturado com o seguinte template JMTE (substituir o valor <i><URL_DO_SERVIDOR_GRAYLOG></i>):

```html
<body style="margin: 0; padding: 0; background: #EEE; text-align: center;">
    <div style="min-width: 900px; max-width: 1200px; display: inline-block; text-align: left; background: #FFF; border: 1px solid #CCC;">
        <div style="background: ${if backlog[0].fields.level = "0"}#c93232${end}${if backlog[0].fields.level = "1"}#c93232${end}${if backlog[0].fields.level = "2"}#c93232${end}${if backlog[0].fields.level = "3"}#c93232${end}${if backlog[0].fields.level = "4"}#da7605${end}${if backlog[0].fields.level = "5"}#da7605${end}; width: 100%; color: #FFF; text-align: center; font-size: 12pt; padding: 10px; margin: 0px; border-bottom: 1px solid #000; box-sizing: border-box;">
            <!-- Texto: "Ocorreu(ram) N (tipo_ocorrencia) em (nome_serviço)" -->
            ${if backlog.length = "1"}Ocorreu${else}Ocorreram${end} ${backlog.length} ${if backlog[0].fields.level = "0"}${if backlog.length = "1"}emergência${else}emergências${end}${end}${if backlog[0].fields.level = "1"}${if backlog.length = "1"}alerta${else}alertas${end}${end}${if backlog[0].fields.level = "2"}${if backlog.length = "1"}criticidade${else}criticidades${end}${end}${if backlog[0].fields.level = "3"}${if backlog.length = "1"}erro${else}erros${end}${end}${if backlog[0].fields.level = "4"}${if backlog.length = "1"}aviso${else}avisos${end}${end}${if backlog[0].fields.level = "5"}${if backlog.length = "1"}observação${else}observações${end}${end} em <strong>${backlog[0].fields.facility} ${backlog[0].fields.app_version}</strong> [${backlog[0].fields.environment}] (<a href="<URL_DO_SERVIDOR_GRAYLOG>/alerts/${event.id}/replay-search" style="color: #FFF;">ver no Graylog</a>):
        </div>

        <div style="background: #999; margin: 5px 0px; padding: 3px 0px;">
            <div style="width: 100%; height: 4px; background-image: linear-gradient(to right, #999 50%, transparent 50%), linear-gradient(to bottom, #FFF 50%, transparent 50%); background-size: 10px 10px;"></div>
        </div>

        <!-- Aqui começa o loop -->
        ${foreach backlog message}

        <table style="width: 100%; border: 1px solid #333;" border="0" cellspacing="0">
            <tr>
                <td style="width: 50%; text-align: center; background: #555; color: #FFF; padding: 3px;">
                    <strong>${message.timestamp}</strong>
                </td>
                <td style="width: 50%; text-align: center; background: #E8EEF1; color: #333; padding: 3px;">
                    <span style="font-size: 9pt;">HOST</span>: <strong>${message.source}</strong>${if message.fields.gl2_remote_ip} (${message.fields.gl2_remote_ip})${end}
                </td>
            </tr>
        </table>

        <div style="width: 100%; text-align: center; padding: 5px; box-sizing: border-box;">
            <div style="display: inline-block; text-align: justify; font-size: 9pt;">
                <pre style="margin: 10px"><strong>MENSAGEM</strong>: ${message.message}</pre>
            </div>
        </div>
        
        ${if message.fields.error_message}
        <div style="width: 100%; text-align: center; padding: 5px; box-sizing: border-box;">
            <div style="display: inline-block; text-align: justify; font-size: 9pt;">
                <pre style="margin: 10px; margin-top: 0px; color: #c93232"><strong>ERRO</strong>: ${message.fields.error_message}</pre>
            </div>
        </div>
        ${end}

        ${if message.fields.error_stack}
        <div style="width: 100%; text-align: center; background: #f3e5ba; padding-bottom: 10px">
                <div style="padding: 5px; background: #f3e5ba; color: #664d03; font-size: 9pt; border: 1px solid #f0d482">
                    <strong>RASTREAMENTO:</strong>
                </div>
                <pre style="width: auto; display: inline-block; text-align: left; padding: 10px; margin: 0px; background: #FFF3CF; color: #664d03;">${message.fields.error_stack}</pre>
        </div>
        ${end}

        ${if message.fields.extra_info}
        <div style="width: 100%; text-align: center; background: #b2c8d3; padding-bottom: 10px;">
            <div style="padding: 5px; background: #aec8d4; color: #103141; font-size: 9pt; border: 1px solid #79b4d1;">
                <strong>INFORMAÇÕES EXTRAS:</strong>
            </div>
            <pre style="width: auto; display: inline-block; text-align: left; background: #c8d8df; color: #002944; padding: 10px; margin: 0">${message.fields.extra_info}</pre>
        </div>
        ${end}

        <div style="background: #999; margin: 5px 0px; padding: 3px 0px;">
            <div style="width: 100%; height: 4px; background-image: linear-gradient(to right, #999 50%, transparent 50%), linear-gradient(to bottom, #FFF 50%, transparent 50%); background-size: 10px 10px;"></div>
        </div>

        <!-- Aqui termina o loop -->
        ${end}
    </div>
</body>
```