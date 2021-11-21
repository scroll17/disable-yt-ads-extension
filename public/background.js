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

                    getLocalStorageItem(tabId, value => {
                        if(!value) {
                            setLocalStorageItem(AUTO_REMOVE_ADS_STATUS, '0', result => {
                                console.log('- SET AUTO REMOVE ADS LC ITEM-')
                            })
                        } else {
                            const autoRemoveValue = Boolean(Number(value));
                            if(autoRemoveValue) {
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
                    })
                } else {
                    console.log('%c(Auto) Advertising remove script not init!', 'color: red')
                }
            }
        )
    }
})

function getLocalStorageItem(tabId, itemName, callback) {
    chrome.tabs.executeScript(
        tabId,
        {
            code: `(() => localStorage.getItem('${itemName}'))()`
        },
        result => {
            callback(result[0])
        }
    )
}

function setLocalStorageItem(tabId, itemName, itemValue, callback) {
    chrome.tabs.executeScript(
        tabId,
        {
            code: `(() => localStorage.setItem('${itemName}', '${itemValue}'))()`
        },
        result => {
            callback(result[0])
        }
    )
}