export function promisify(f, bind) {
    return function (...args) {
        return new Promise(resolve => {
            args.push((results) => resolve(results))
            f.call(bind ?? this, ...args)
        })
    }
}

export async function sleep(time) {
    return new Promise(res => setTimeout(res, time))
}

export function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

export class Logger {
    constructor(level = 'info') {
        this.colors = {
            green: 'color: green',
            blue: 'color: blue',
            yellow: 'color: yellow',
            red: 'color: red'
        }
        this.levels = {
            info: 1,
            debug: 2,
            warn: 3,
            error: 4
        }

        if(!this._isValidLevel(level)) throw new Error(`Invalid level`)
        this.level = level;
    }

    setLevel(level) {
        if(!this._isValidLevel(level)) throw new Error(`Invalid level`)
        this.level = level;
    }

    info(message, data) {
        this._log('info', message, data)
    }

    debug(message, data) {
        this._log('debug', message, data)
    }

    warn(message, data) {
        this._log('warn', message, data)
    }

    error(massage, data) {
        this._log('error', massage, data)
    }

    _isValidLevel(level) {
        return Object.keys(this.levels).includes(level)
    }

    _colorByLevel(level) {
        switch (level) {
            case 'info': return this.colors.green
            case 'debug': return this.colors.blue
            case 'warn': return this.colors.yellow
            case 'error': return this.colors.red
        }
    }

    _log(level, message, data) {
        if(this.levels[level] < this.levels[this.level]) return;
        console.log(`%c${level.toUpperCase()}:`, this._colorByLevel(level), message, data ?? '')
    }
}

export class TabLocalStorage {
    constructor(tab) {
        if(!tab) throw new Error(`Tab is required params`)
        this.tab = tab;
    }

    async getItem(key) {
        const results = await chrome.scripting.executeScript({
            target: {
                tabId: this.tab.id,
            },
            func: (key) => localStorage.getItem(key),
            args: [key]
        })

        if(Array.isArray(results)) {
            return results.length > 1 ? results : results[0].result
        }

        return results.result
    }

    async setItem(key, value) {
        await chrome.scripting.executeScript({
            target: {
                tabId: this.tab.id,
            },
            func: (key, value) => localStorage.setItem(key, value),
            args: [key, value]
        })
    }
}

export class BrowserTab {
    constructor() {
        this.currentTab = undefined;
    }

    setTab(tab) {
        this.currentTab = tab;
    }

    getLocalStorage() {
        if(!this.currentTab) throw new Error(`Tab not found`)
        return new TabLocalStorage(this.currentTab)
    }

    async getCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if(tabs.length < 1) {
            throw new Error(`No one active tabs found`)
        }

        return (this.currentTab = tabs[0])
    }
}

export class ControlHTMLElement {
    constructor(element) {
        if(!element) throw new Error(`Element is required param`)
        this.element = element
    }

    getElement() {
        return this.element;
    }

    setElement(element) {
        if(!element) throw new Error(`Element is required param`)
        this.element = element
    }

    setStyle(obj) {
        const elementStyle = this.element.style;
        for(const [key, value] of Object.entries(obj)) {
            elementStyle[key] = value;
        }

        return this;
    }

    setInnerText(text) {
        this.element.innerText = text;
        return this;
    }

    static getInstanceById(id) {
        const element = document.getElementById(id);
        if(!element) return null;

        return new ControlHTMLElement(element);
    }
}

export class EventSender {
    // request always have structure: { eventType: '...', data: {...} }

    static eventTypes = {
        getExecResult: 'get-execute-result',
        checkInject: 'check-inject',
        inject: 'inject'
    }
    static eventStructs = {
      [this.eventTypes.checkInject]: {
          req: {
              tabId: Number
          },
          res: {
              injected: Boolean
          }
      },
      [this.eventTypes.inject]: {
          req: {
              tabId: Number
          },
          res: {
              resultOfInject: String
          }
      },
      [this.eventTypes.getExecResult]: {
          req: {
              tabId: Number,
              repeat: Number,
              sleepTime: Number
          },
          res: {
              run: Boolean
          }
      }
    }

    constructor(logger) {
        this.logger = logger
    }

    async sendEvent(eventType, data) {
        this.logger.info(`Start send Event: "${eventType}"`, { eventType, data })

        if(!this._checkEventType(eventType)) {
            throw new Error(`Invalid event type: "${eventType}"`)
        }

        this.checkRequest(eventType, data);

        const response = await new Promise(resolve => {
            chrome.runtime.sendMessage(
                {
                    eventType,
                    data
                },
                response => resolve(response)
            );
        })

        this.logger.info(`Response on Event "${eventType}" -`, response ?? '<empty>')

        this.checkResponse(eventType, response.data);

        return response.data;
    }

    checkRequest(eventType, data) {
        this._check(eventType, data, 'req')
    }

    checkResponse(eventType, data) {
        this._check(eventType, data, 'res')
    }

    _checkEventType(eventType) {
        return Object.values(EventSender.eventTypes).includes(eventType)
    }

    _checkStructureItem(structureValue, dataValue) {
        if(Array.isArray(structureValue)) {
            return structureValue.some(value => this._checkStructureItem(value, dataValue))
        }

        switch (true) {
            case (structureValue === Boolean): {
                return typeof dataValue === 'boolean'
            }
            case (structureValue === Number): {
                return typeof dataValue === 'number'
            }
            case (structureValue === String): {
                return typeof dataValue === 'string'
            }
            case (typeof structureValue === 'undefined'): {
                return typeof dataValue === 'undefined'
            }
            case (structureValue === null): {
                return typeof dataValue === null
            }
            default: {
                this.logger.warn('Undefined structure value handler', { structureValue, dataValue })
                return false;
            }
        }
    }

    _checkStructure(structure, data) {
        const structureKeys = Object.keys(structure);

        structureKeys.forEach(key => {
            const structureValue = structure[key];
            const dataValue = data[key];

            const result = this._checkStructureItem(structureValue, dataValue);
            if(!result) {
                this.logger.error(`Event data is invalid`, { structureValue, dataValue, key })
                throw new Error(`Invalid event data`)
            }
        })
    }

    _check(eventType, data, type) {
        this.logger.debug(`Start check Event "${eventType}" - ${type} data...`, { eventType, data, type })

        if(!this._checkEventType(eventType)) {
            throw new Error(`Invalid event type: "${eventType}"`)
        }

        if(!['req', 'res'].includes(type)) {
            throw new Error(`Invalid type: "${type}"`)
        }

        const eventStructure = EventSender.eventStructs[eventType];
        const structure = type === 'req' ? eventStructure.req : eventStructure.res;

        const structureKeys = Object.keys(structure);
        const dataKeys = Object.keys(data);

        const missedStructureKeys = structureKeys.filter(key => !dataKeys.includes(key));
        if(missedStructureKeys.length) {
            this.logger.error(`Missed required Structure keys for type: "${type}"`, missedStructureKeys)
            throw new Error(`Missed required Structure keys`)
        }

        this._checkStructure(structure, data);

        this.logger.debug(`Event "${eventType}" data is valid`, { eventType, data, type })
    }
}