import { ControlHTMLElement, Logger, BrowserTab, EventSender } from './js/base.mjs'

class ButtonRemoveAds extends ControlHTMLElement {
    static elementId = 'modal'

    static getInstance() {
        const element = document.getElementById(this.elementId);
        if(!element) return null;

        return new ButtonRemoveAds(element);
    }
}

class TextRemoveAds extends ControlHTMLElement {
    static elementId = 'text'

    changeToActive() {
        this
            .setStyle({
                color: 'green',
                fontWeight: 'bold'
            })
            .setInnerText('ON')
    }

    changeToNotActive() {
        this
            .setStyle({
                color: 'black',
                fontWeight: undefined
            })
            .setInnerText('OFF')
    }

    static getInstance() {
        const element = document.getElementById(this.elementId);
        if(!element) return null;

        return new TextRemoveAds(element);
    }
}

class ButtonAutoRemoveAds extends ControlHTMLElement {
    static elementId = 'b-auto-off'

    changeToActive() {
        this
            .setStyle({
                color: 'limegreen',
                fontWeight: 'bold'
            })
            .setInnerText('YES')
    }

    changeToNotActive() {
        this
            .setStyle({
                color: 'black',
                fontWeight: undefined
            })
            .setInnerText('NO')
    }

    static getInstance() {
        const element = document.getElementById(this.elementId);
        if(!element) return null;

        return new ButtonAutoRemoveAds(element);
    }
}

class Page {
    AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'
    YT_URL = 'www.youtube.com/watch'

    logger = new Logger()

    constructor(targetTabUrl = this.YT_URL) {
        this.logger.setComponentName('Extension')

        this.targetTabUrl = targetTabUrl;
        this.eventSender = new EventSender(this.logger);
    }

    setTargetTabUrl(url) {
        this.targetTabUrl = url;
    }

    isTargetTab(tab) {
        return tab.active && tab.url.includes(this.targetTabUrl)
    }

    createTurnOnRemoveAdsHandler(data) {
        let { injected, run, currentTab, textRemoveAds } = data;

        return async () => {
            if(run) {
                this.logger.debug('Remove ADS script already run...', data)
                return;
            }

            if(injected) {
                this.logger.debug('Remove ADS script already injected...', data)
            } else {
                await this.eventSender.sendEvent(EventSender.eventTypes.inject, { tabId: currentTab.id });
                injected = true;
            }

            const removeAdsScriptExecuteStatus = await this.eventSender.sendEvent(EventSender.eventTypes.getExecResult, {
                tabId: currentTab.id,
                repeat: 3,
                sleepTime: 1500
            })
            run = removeAdsScriptExecuteStatus.run

            if(run) {
                textRemoveAds.changeToActive();
            } else {
                textRemoveAds.changeToNotActive();
            }
        }
    }

    listenOnLoad() {
        window.onload = async () => {
            this.logger.info('Extension page loaded')

            const textRemoveAds = TextRemoveAds.getInstance();
            if(!textRemoveAds) throw new Error(`Text Remove Ads not found`)

            const buttonRemoveAds = ButtonRemoveAds.getInstance();
            if(!buttonRemoveAds) throw new Error(`Button Remove Ads not found`)

            const buttonAutoRemoveAds = ButtonAutoRemoveAds.getInstance();
            if(!buttonAutoRemoveAds) throw new Error(`Button Auto Remove Ads not found`)

            const browserTab = new BrowserTab();
            const currentTab = await browserTab.getCurrentTab();
            if(!this.isTargetTab(currentTab)) {
                this.logger.info('Current tab is no target tab', { currentTab })
                return;
            }

            const removeAdsScriptInjectStatus = await this.eventSender.sendEvent(EventSender.eventTypes.checkInject, { tabId: currentTab.id })
            const removeAdsScriptExecuteStatus = await this.eventSender.sendEvent(EventSender.eventTypes.getExecResult, {
                tabId: currentTab.id,
                repeat: 3,
                sleepTime: 1500
            })

            const turnOnRemoveAdsHandler = this.createTurnOnRemoveAdsHandler({
                injected: removeAdsScriptInjectStatus.injected,
                run: removeAdsScriptExecuteStatus.run,
                currentTab: currentTab,
                textRemoveAds: textRemoveAds
            })

            // BUTTON REMOVE ADS
            if(removeAdsScriptInjectStatus.injected && removeAdsScriptExecuteStatus.run) {
                this.logger.debug('Remove ADS script already injected and run', { removeAdsScriptInjectStatus, removeAdsScriptExecuteStatus })
                textRemoveAds.changeToActive();
            } else {
                this.logger.debug('Remove ADS script NOT injected or run', { removeAdsScriptInjectStatus, removeAdsScriptExecuteStatus })
                textRemoveAds.changeToNotActive();
            }

            // BUTTON AUTO REMOVE ADS
            const currentTabLocalStorage = browserTab.getLocalStorage();

            const autoRemoveAdsStatusRaw = await currentTabLocalStorage.getItem(this.AUTO_REMOVE_ADS_STATUS);
            if(!autoRemoveAdsStatusRaw) {
                this.logger.info(`Value by key: "${this.AUTO_REMOVE_ADS_STATUS}" not exist in LocalStorage`, { autoRemoveAdsStatusRaw })

                await currentTabLocalStorage.setItem(this.AUTO_REMOVE_ADS_STATUS, '0')

                this.logger.debug(`Set default value ('0') to LocalStorage by key: "${this.AUTO_REMOVE_ADS_STATUS}"`, { autoRemoveAdsStatusRaw: '0' })

                buttonAutoRemoveAds.changeToNotActive();
            } else {
                const autoRemoveAdsStatus = Boolean(Number(autoRemoveAdsStatusRaw));

                if(autoRemoveAdsStatus) {
                    this.logger.info('Auto remove ads is enable', { autoRemoveAdsStatus });

                    await turnOnRemoveAdsHandler();
                    buttonAutoRemoveAds.changeToActive();

                } else {
                    this.logger.info('Auto remove ADS is disabled', { autoRemoveAdsStatus })

                    buttonAutoRemoveAds.changeToNotActive();
                }
            }

            // PAGE EVENT HANDLERS
            buttonRemoveAds
                .getElement()
                .onclick = turnOnRemoveAdsHandler

            buttonAutoRemoveAds
                .getElement()
                .onclick = async () => {
                    const autoRemoveAdsStatusRaw = await currentTabLocalStorage.getItem(this.AUTO_REMOVE_ADS_STATUS);
                    const autoRemoveAdsStatus = Boolean(Number(autoRemoveAdsStatusRaw));

                    if(autoRemoveAdsStatus) {
                        await currentTabLocalStorage.setItem(this.AUTO_REMOVE_ADS_STATUS, '0');
                        buttonAutoRemoveAds.changeToNotActive();

                        this.logger.debug(`Change value ('1') -> ('0') in LocalStorage by key: "${this.AUTO_REMOVE_ADS_STATUS}"`, {
                            old: autoRemoveAdsStatus,
                            new: !autoRemoveAdsStatus
                        })
                    } else {
                        await turnOnRemoveAdsHandler();

                        await currentTabLocalStorage.setItem(this.AUTO_REMOVE_ADS_STATUS, '1')
                        buttonAutoRemoveAds.changeToActive();

                        this.logger.debug(`Change value ('0') -> ('1') in LocalStorage by key: "${this.AUTO_REMOVE_ADS_STATUS}"`, {
                            old: autoRemoveAdsStatus,
                            new: !autoRemoveAdsStatus
                        })
                    }
                }
        }
    }
}

const page = new Page();
page.listenOnLoad();