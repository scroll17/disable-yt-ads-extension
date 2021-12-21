import { sleep, Logger, TabLocalStorage } from './base.mjs'

class Page {
    AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'
    YT_URL = 'www.youtube.com/watch'
    DISABLE_ADS_SCRIPT_ID = 'disable-ads-script-id'

    logger = new Logger()

    constructor(targetTabUrl = this.YT_URL) {
        this.targetTabUrl = targetTabUrl;
    }

    setTargetTabUrl(url) {
        this.targetTabUrl = url;
    }

    isTargetTab(changeInfo, tab) {
        const tabIsLoaded = changeInfo.status == 'complete';
        const tabHaveValidUrl = tab.url.includes(this.targetTabUrl)

        return tabIsLoaded && tab.active && tabHaveValidUrl
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

    listenExtensionMessages() {
        chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
            /**
             *  Sender: {
             *      id: "ofaifckbaekjaiaejffcneoimkdmkmde"
             *      origin: "chrome-extension://ofaifckbaekjaiaejffcneoimkdmkmde"
             *      url: "chrome-extension://ofaifckbaekjaiaejffcneoimkdmkmde/index.html"
             *  }
             * */

            sendResponse(request);
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

        let step = 1;
        while (step <= repeat) {
            this.logger.debug('Step -', step);

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
                   step++;
                }
            } else {
                await sleep(sleepTime)
                step++;
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
            },
            args: [this.DISABLE_ADS_SCRIPT_ID, this._getDisableAdsScriptUrl()]
        })

        this.logger.info('Result of inject ADS script', resultObject)
    }

    async _executeDisableAdsScript(tabId, repeat, sleepTime) {
        this.logger.debug('Start execute disable ADS script...', { tabId, repeat, sleepTime })

        let step = 1;
        while (step <= repeat) {
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
                step++;
            }
        }

        this.logger.warn('Some error when executed remove ADS script')
    }
}

const page = new Page()
page.listenOnUpdate()
page.listenExtensionMessages();