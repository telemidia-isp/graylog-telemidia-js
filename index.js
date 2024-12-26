const graylog = require('gelf-pro');

class GraylogTelemidia {
    constructor(config = null) {
        this.config = {
            ...this.getDefaultConfig(),
            ...config
        };

        // Define o valor padrão de "showConsole" para "true"
        this.config.showConsole = this.config.showConsole ?? true;

        this.config = this.processConfig(this.config);
        this.validateConfig(this.config);
        this.logger = this.initializeLogger(this.config);
    }

    // Obtém as configurações padrão do Graylog a partir das variáveis de ambiente.
    getDefaultConfig() {
        return {
            server: process.env.GRAYLOG_SERVER,
            inputPort: process.env.GRAYLOG_INPUT_PORT,
            appName: process.env.GRAYLOG_APP_NAME,
            appVersion: process.env.GRAYLOG_APP_VERSION,
            environment: process.env.GRAYLOG_ENVIRONMENT,
            showConsole: process.env.GRAYLOG_SHOW_CONSOLE
        };
    }

    // Processa a configuração, convertendo tipos conforme necessário.
    processConfig(config) {
        if (typeof config.inputPort === 'string') {
            config.inputPort = parseInt(config.inputPort);
        }

        if (typeof config.showConsole === 'string') {
            config.showConsole = config.showConsole.toLowerCase() !== 'false';
        }

        return config;
    }

    // Valida as configurações fornecidas.
    validateConfig(config) {
        const requiredKeys = ['server', 'inputPort', 'appName', 'appVersion', 'environment'];
        requiredKeys.forEach(key => {
            if (!config[key]) {
                throw new Error(`A configuração '${key}' é obrigatória.`);
            }
        });

        const allowedEnvironments = ['PROD', 'DEV', 'STAGING'];
        if (!allowedEnvironments.includes(config.environment)) {
            throw new Error(`A configuração 'environment' deve ser uma das seguintes: ${allowedEnvironments.join(', ')}`);
        }
    }

    // Inicializa o logger com as configurações fornecidas.
    initializeLogger(config) {
        graylog.setConfig({
            fields: {},
            adapterName: 'udp',
            adapterOptions: {
                host: config.server,
                port: config.inputPort
            }
        });
        return graylog;
    }

    // Método mágico para chamar métodos de log.
    log(level, ...args) {
        this.timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19); // Define a timestamp do log
        const payload = this.preparePayload(args);
        const message = this.extractMessage(args);
        this.logger[level](message, payload);

        // Exibe os detalhes do log no console, caso especificado na configuração (padrão: true)
        if (this.config.showConsole) {
            this.logToConsole(level, message, payload);
        }

        return this.buildResponsePayload(level, message, payload);
    }

    // Extrai a mensagem do primeiro argumento.
    extractMessage(args) {
        return (args[0] instanceof Error) ? args[0].message : args[0];
    }

    // Prepara o payload para o log.
    preparePayload(args) {
        const argumentsArray = [];
        const errorMessages = [];
        const stackTraces = [];

        args.forEach((arg, index) => {
            if (index === 0 && !(arg instanceof Error)) {
                return; // Ignora o primeiro parâmetro se não for uma mensagem de log
            }

            if (arg instanceof Error) {
                this.handleError(arg, errorMessages, stackTraces);
            } else if (Array.isArray(arg)) {
                this.handleArrayArgument(arg, errorMessages, stackTraces, argumentsArray);
            } else if (typeof arg === 'object') {
                this.handleObjectArgument(arg, errorMessages, stackTraces, argumentsArray);
            } else {
                argumentsArray.push(arg);
            }
        });

        return this.buildPayload(
            this.formatArguments(argumentsArray),
            this.formatErrorMessages(errorMessages),
            this.formatStackTraces(stackTraces)
        );
    }

    // Lida com um argumento do tipo Error.
    handleError(arg, errorMessages, stackTraces) {
        const errorMessage = arg.message;
        errorMessages.push(errorMessage); // Adiciona a mensagem de erro sem numeração
        stackTraces.push({
            error: errorMessage,
            stackTrace: arg.stack
        });
    }

    // Lida com um argumento do tipo array.
    handleArrayArgument(arg, errorMessages, stackTraces, argumentsArray) {
        arg.forEach(value => {
            if (value instanceof Error) {
                this.handleError(value, errorMessages, stackTraces);
            } else {
                argumentsArray.push(value);
            }
        });
    }

    // Lida com um argumento do tipo objeto.
    handleObjectArgument(arg, errorMessages, stackTraces, argumentsArray) {
        // Função auxiliar para busca recursiva
        const recursiveSearch = (obj) => {
            for (const key in obj) {
                if (obj[key] instanceof Error) {
                    this.handleError(obj[key], errorMessages, stackTraces);
                    delete obj[key]; // Remove o erro do objeto
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    recursiveSearch(obj[key]); // Chama a função recursivamente
                }
            }
        };

        // Inicia a busca recursiva
        recursiveSearch(arg);

        // Adiciona o objeto modificado ao extra_info se não estiver vazio
        if (Object.keys(arg).length > 0) {
            argumentsArray.push(arg); // Adiciona o objeto modificado ao extra_info
        }
    }

    // Formata os argumentos em JSON.
    formatArguments(argumentsArray) {
        if (argumentsArray.length === 0) {
            return null;
        }
        return JSON.stringify(argumentsArray, null, 4);
    }

    // Formata as mensagens de erro.
    formatErrorMessages(errorMessages) {
        if (errorMessages.length === 0) {
            return null;
        }
        // Se houver apenas um erro, retorna a mensagem sem numeração
        if (errorMessages.length === 1) {
            return errorMessages[0];
        }
        // Se houver mais de um erro, retorna a mensagem concatenada com numeração
        return errorMessages.map((msg, index) => `[Erro #${index + 1}]: ${msg}`).join(" | ");
    }

    // Formata os stacktraces.
    formatStackTraces(stackTraces) {
        if (stackTraces.length === 0) {
            return null;
        }
        return stackTraces.map((trace, index) => stackTraces.length === 1 ? trace.stackTrace : `[Stacktrace do erro #${index + 1} "${trace.error}"]:\n${trace.stackTrace}\n`).join("\n");
    }

    // Constrói o payload final para o log.
    buildPayload(jsonArguments, errorMessages, stackTraces) {
        const payload = {
            app_language: 'JavaScript',
            facility: this.config.appName,
            environment: this.config.environment
        };

        if (errorMessages) {
            payload.error_message = errorMessages;
        }
        if (stackTraces) {
            payload.error_stack = stackTraces;
        }
        if (jsonArguments) {
            payload.extra_info = jsonArguments;
        }

        return payload;
    }

    // Constrói o payload de resposta para o log.
    buildResponsePayload(level, message, payload) {
        const responsePayload = {
            timestamp: this.timestamp,
            level: level,
            message: message
        };

        // Mescla o payload fornecido com o responsePayload
        return { ...responsePayload, ...payload };
    }

    // Formata os argumentos para serem exibidos no console
    formatConsoleArguments(obj) {
        if (typeof obj === 'string') {
            obj = JSON.parse(obj);
        }

        return JSON.stringify(obj, null, 4);
    }

    // Registra a mensagem no console
    logToConsole(level, message, payload) {
        let consoleMessage = "========= GRAYLOG MESSAGE [" + this.timestamp + "]: =========\n";

        consoleMessage += "Application: " + this.config.appName + " | Version: " + (this.config.appVersion || 'N/A') + " | Environment: " + this.config.environment + "\n";

        consoleMessage += "[" + level + "] \"" + message + "\"\n";

        if (payload.error_message) {
            consoleMessage += 'Error message: "' + payload.error_message.trim() + '"\n';
        }
        if (payload.error_stack) {
            consoleMessage += "Stacktrace:\n" + payload.error_stack.trim() + "\n";
        }
        if (payload.extra_info) {
            consoleMessage += "Extra info:\n" + this.formatConsoleArguments(payload.extra_info) + "\n";
        }

        consoleMessage += "================= END OF GRAYLOG MESSAGE =================\n";

        if (['emergency', 'alert', 'critical', 'error'].includes(level)) {
            console.error(consoleMessage);
        } else {
            console.log(consoleMessage);
        }
    }

    // Métodos de log para diferentes níveis
    emergency(...args) {
        return this.log('emergency', ...args);
    }

    alert(...args) {
        return this.log('alert', ...args);
    }

    critical(...args) {
        return this.log('critical', ...args);
    }

    error(...args) {
        return this.log('error', ...args);
    }

    warning(...args) {
        return this.log('warning', ...args);
    }

    notice(...args) {
        return this.log('notice', ...args);
    }

    info(...args) {
        return this.log('info', ...args);
    }

    debug(...args) {
        return this.log('debug', ...args);
    }
}

module.exports = GraylogTelemidia;