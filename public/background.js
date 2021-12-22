import { sleep, Logger, TabLocalStorage, EventSender } from './js/base.mjs'

class Page {
    AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'
    DISABLE_ADS_SCRIPT_ID = 'disable-ads-script-id'
    YT_URL = 'www.youtube.com/watch'

    logger = new Logger()

    constructor(targetTabUrl = this.YT_URL) {
        this.logger.setComponentName('Background Worker')

        this.targetTabUrl = targetTabUrl;
        this.eventSender = new EventSender(this.logger);
    }

    setTargetTabUrl(url) {
        this.targetTabUrl = url;
    }

    isTargetTab(changeInfo, tab) {
        const tabIsLoaded = changeInfo.status == 'complete';
        const tabHaveValidUrl = tab.url.includes(this.targetTabUrl)

        return tabIsLoaded && tabHaveValidUrl
    }

    listenOnUpdate() {
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            const isTargetTab = this.isTargetTab(changeInfo, tab);
            if(!isTargetTab) return;

            this.logger.debug('Page loaded', { tab, changeInfo })

            const tabLocalStorage = new TabLocalStorage(tab);

            const autoRemoveAdsStatusRaw = await tabLocalStorage.getItem(this.AUTO_REMOVE_ADS_STATUS);
            if(!autoRemoveAdsStatusRaw) {
                this.logger.info(`Value by key: "${this.AUTO_REMOVE_ADS_STATUS}" not exist in LocalStorage`, { autoRemoveAdsStatusRaw })

                await tabLocalStorage.setItem(this.AUTO_REMOVE_ADS_STATUS, '0')

                this.logger.debug(`Set default value ('0') to LocalStorage by key: "${this.AUTO_REMOVE_ADS_STATUS}"`, { autoRemoveAdsStatusRaw: '0' })

                return;
            }

            const autoRemoveAdsStatus = Boolean(Number(autoRemoveAdsStatusRaw));
            if(autoRemoveAdsStatus) {
                this.logger.info('Auto remove ads is enable', { autoRemoveAdsStatus });

                const scriptAlreadyExecuted = await this._checkDisableAdsScriptIsInjected(tabId);
                if(scriptAlreadyExecuted) {
                    this.logger.info('Disable ADS script already injected', { scriptAlreadyExecuted })
                    return;
                }

                await this._injectDisableAdsScript(tabId);

                const resultOfInject = await this._getDisableAdsScriptExecuteResult(tabId, 5, 1500);
                if(resultOfInject) {
                    this.logger.info('Remove ADS script run!')
                } else {
                    this.logger.error('Some error when executed remove ADS script')
                }
            } else {
                this.logger.info('Auto remove ADS is disabled', { autoRemoveAdsStatus })
            }
        })
    }

    async extensionMessageHandler(request, sender) {
        const { eventType, data } = request;

        this.logger.info(`Handle extension request Event: "${eventType}"`, { data });

        let responseData;
        switch (eventType) {
            case EventSender.eventTypes.checkInject: {
                const injected = await this._checkDisableAdsScriptIsInjected(data.tabId);
                responseData = { injected }

                break;
            }
            case EventSender.eventTypes.inject: {
                const resultOfInject = await this._injectDisableAdsScript(data.tabId);
                responseData = { resultOfInject }

                break;
            }
            case EventSender.eventTypes.getExecResult: {
                const run = await this._getDisableAdsScriptExecuteResult(data.tabId, data.repeat, data.sleepTime);
                responseData = { run }

                break;
            }
            default: {
                this.logger.info(`Unprocessed event type: "${eventType}"`, { data })

                responseData = {}
                break;
            }
        }
        if(!responseData) throw new Error(`Response data not found`)

        const response = { data: responseData };

        this.logger.info(`Send response on event: "${eventType}"`, { response })

        return response;
    }

    listenExtensionMessages() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this
                .extensionMessageHandler(request, sender)
                .then(response => sendResponse(response))

            return true;
        })
    }

    _getDisableAdsScriptUrl() {
        return chrome.runtime.getURL('disable-ads-script.js')
    }

    async _checkDisableAdsScriptIsInjected(tabId) {
        this.logger.debug('Check inject disable ADS script...', { tabId })

        const [resultObject] = await chrome.scripting.executeScript({
            target: {
                tabId
            },
            func: (scriptId) => {
                const element = document.getElementById(scriptId)
                return Boolean(element)
            },
            args: [this.DISABLE_ADS_SCRIPT_ID]
        });

        return resultObject.result;
    }

    async _getDisableAdsScriptExecuteResult(tabId, repeat, sleepTime) {
        this.logger.debug('Get disable ADS script execute result...', { tabId, repeat, sleepTime })

        let attempt = 1;
        while (attempt <= repeat) {
            this.logger.debug('Attempt -', attempt);

            const [resultObject] = await chrome.scripting.executeScript({
                target: {
                    tabId
                },
                func: (scriptId) => {
                    const element = document.getElementById(scriptId)
                    if(!element || !element.title) return null;

                    return JSON.parse(element.title)
                },
                args: [this.DISABLE_ADS_SCRIPT_ID]
            });

            this.logger.debug('Result of execute remove ads script', resultObject)

            if(resultObject.result) {
                const { run, error } = resultObject.result;
                if(error) {
                    this.logger.error('Error on execute remove ads script -', error)
                }

                if(run) {
                   return true;
                } else {
                    this.logger.debug('Remove ADS script is not running...', { run, error })

                   await sleep(sleepTime)
                   attempt++;
                }
            } else {
                await sleep(sleepTime)
                attempt++;
            }
        }

        return false;
    }

    async _injectDisableAdsScript(tabId) {
        this.logger.debug('Start inject disable ADS script...', { tabId })

        const [resultObject] = await chrome.scripting.executeScript({
            target: {
                tabId
            },
            func: (scriptId, scriptUrl) => {
                const script = document.createElement('script')

                script.id = scriptId;
                script.src = scriptUrl;

                document.documentElement.appendChild(script)

                return 'OK'
            },
            args: [this.DISABLE_ADS_SCRIPT_ID, this._getDisableAdsScriptUrl()]
        })

        this.logger.info('Result of inject ADS script', resultObject)

        return resultObject.result;
    }

    async _executeDisableAdsScript(tabId, repeat, sleepTime) {
        this.logger.debug('Start execute disable ADS script...', { tabId, repeat, sleepTime })

        let attempt = 1;
        while (attempt <= repeat) {
            this.logger.debug('Attempt -', attempt);

            const [resultObject] = await chrome.scripting.executeScript({
                target: {
                    tabId
                },
                files: ['disable-ads-script.js']
            })

            this.logger.debug('Result of execute remove ads script', resultObject)

            const { run, error } = resultObject.result;
            if(run) {
                this.logger.info('Remove ADS script run!', resultObject)
                return;
            } else {
                this.logger.debug('Remove ADS script is not running...', { run, error })

                await sleep(sleepTime)
                attempt++;
            }
        }

        this.logger.warn('Some error when executed remove ADS script')
    }
}

const page = new Page()
page.listenOnUpdate()
page.listenExtensionMessages();