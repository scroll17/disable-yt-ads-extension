const AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'

chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {
        chrome.tabs.executeScript(
            tabId,
            {
                file: './disable-ads-script.js'
            },
            result => {
                const [res] = result;
                if(res) {
                    console.log('%c(Auto) Advertising remove script init!', 'color: green')

                    const autoRemoveIsOn = localStorage.getItem(AUTO_REMOVE_ADS_STATUS);
                    if(!autoRemoveIsOn) {
                        localStorage.setItem(AUTO_REMOVE_ADS_STATUS, '0')
                    } else {
                        if(Number(autoRemoveIsOn) === 1) {
                            chrome.tabs.executeScript(
                                tabId,
                                {
                                    code: `(() => window.__remove_yt_ads_exec && window.__remove_yt_ads_exec())()`
                                },
                                result => {
                                    const [res] = result;
                                    if(res) {
                                        console.log('%c(Auto) Advertising remove script run!', 'color: green')
                                    } else {
                                        console.log('%c(Auto) Advertising remove script not run!', 'color: red')
                                    }
                                }
                            )
                        }
                    }
                } else {
                    console.log('%c(Auto) Advertising remove script not init!', 'color: red')
                }
            }
        )
    }
})
