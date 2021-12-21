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