const AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'

const buttonRemoveAds = document.getElementById('modal');
const buttonAutoRemoveAds = document.getElementById('b-auto-off')

window.onload = () => {
    if(buttonRemoveAds) {
        isScriptExecuted(res => {
            if(res) {
                changeRemoveAdsText(true)
            }
        })

        buttonRemoveAds.onclick = () => {
            execDisableAdsScript(result => {
                if(!result) throw new Error(`Cannot execute disable ads script`)
            });
        }
    }

    if(buttonAutoRemoveAds) {
        getLocalStorageItem(AUTO_REMOVE_ADS_STATUS, value => {
            if(!value) {
               initDisableAdsScript(res => {
                   if(!res) throw new Error(`Cannot init disable ads script`)

                   setLocalStorageItem(AUTO_REMOVE_ADS_STATUS, '0', result => {
                       console.log('- SET AUTO REMOVE ADS LC ITEM-')

                       changeAutoRemoveAdsText(buttonAutoRemoveAds, false)
                   })
               })
            } else {
                const autoRemoveValue = Boolean(Number(value));
                if(autoRemoveValue) {
                    execDisableAdsScript(result => {
                        if(!result) throw new Error(`Cannot execute disable ads script`)

                        changeAutoRemoveAdsText(buttonAutoRemoveAds, true)
                    });
                } else {
                    changeAutoRemoveAdsText(buttonAutoRemoveAds, false)
                }
            }
        })

        buttonAutoRemoveAds.onclick = () => {
            toggleAutoRemoveAdsStatus(buttonAutoRemoveAds)
        }
    }
}

function changeAutoRemoveAdsText(element, value) {
    if(value) {
        element.style.color = 'limegreen';
        element.style.fontWeight = 'bold';
        element.innerText = 'YES'
    } else {
        element.style.color = 'black';
        element.style.fontWeight = undefined;
        element.innerText = 'NO'
    }
}

function changeRemoveAdsText(value) {
    const text = document.getElementById('text')

    if(value) {
        text.style.color = 'green';
        text.style.fontWeight = 'bold';
        text.innerText = 'ON'
    } else {
        text.style.color = 'black';
        text.style.fontWeight = undefined;
        text.innerText = 'OFF'
    }
}

function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => callback(tabs[0]))
}

function isScriptExisting(callback) {
    getCurrentTab(tab => {
        chrome.tabs.executeScript(
            tab.id,
            {
                code: `(() => window.__remove_yt_ads_exec)()`
            },
            result => {
                console.log('window.__remove_yt_ads_exec => ', result[0])
                callback(Boolean(result[0]))
            }
        )
    })
}

function isScriptExecuted(callback) {
    getCurrentTab(tab => {
        chrome.tabs.executeScript(
            tab.id,
            {
                code: `(() => window.__remove_yt_ads)()`
            },
            result => {
                console.log('window.__remove_yt_ads => ', result[0])
                callback(Boolean(result[0]))
            }
        )
    })
}

function initDisableAdsScript(callback) {
    isScriptExisting(res => {
        if(!res) {
            getCurrentTab(tab => {
                chrome.tabs.executeScript(
                    tab.id,
                    {

                    },
                    result => {
                        const [res] = result;
                        if(res) {
                            console.log('%cAdvertising remove script init!', 'color: green')
                        } else {
                            console.log('%cAdvertising remove script not init!', 'color: red')
                        }

                        callback(res)
                    }
                )
            })
        }
    })
}

function execDisableAdsScript(callback) {
    const exec = () => {
        isScriptExecuted(res => {
            if(!res) {
                getCurrentTab(tab => {
                    chrome.tabs.executeScript(
                        tab.id,
                        {
                            code: `(() => window.__remove_yt_ads_exec && window.__remove_yt_ads_exec())()`
                        },
                        result => {
                            const [res] = result;

                            if(res) {
                                console.log('disable ads script result => ', res)

                                const text = document.getElementById('text')
                                text.style.color = 'green';
                                text.style.fontWeight = 'bold';
                                text.innerText = 'ON'

                                console.log('- TEXT OF DISABLE STATUS CHANGED -')
                            }

                            callback(res);
                        }
                    )
                })
            } else {
                callback(res)
            }
        })
    }

    isScriptExisting(res => {
        if(!res) {
            initDisableAdsScript(res => {
                if(!res) throw new Error(`Cannot init remove ads script`)

                exec()
            })
        } else {
            exec()
        }
    })
}

function getLocalStorageItem(itemName, callback) {
    getCurrentTab(tab => {
        chrome.tabs.executeScript(
            tab.id,
            {
                code: `(() => localStorage.getItem('${itemName}'))()`
            },
            result => {
                callback(result[0])
            }
        )
    })
}

function setLocalStorageItem(itemName, itemValue, callback) {
    getCurrentTab(tab => {
        chrome.tabs.executeScript(
            tab.id,
            {
                code: `(() => localStorage.setItem('${itemName}', '${itemValue}'))()`
            },
            result => {
                callback(result[0])
            }
        )
    })
}

function toggleAutoRemoveAdsStatus(element) {
    getLocalStorageItem(AUTO_REMOVE_ADS_STATUS, value => {
        if(!value) {
            initDisableAdsScript(res => {
                if(!res) throw new Error(`Cannot init disable ads script`)

                setLocalStorageItem(AUTO_REMOVE_ADS_STATUS, '0', result => {
                    console.log('- SET AUTO REMOVE ADS LC ITEM-')

                    changeAutoRemoveAdsText(element, false)
                })
            })
        } else {
            const autoRemoveValue = Boolean(Number(value));
            if(autoRemoveValue) {
                setLocalStorageItem(AUTO_REMOVE_ADS_STATUS, '0', res => {
                    if(!res) throw new Error(`Cannot change local storage item`)

                    changeAutoRemoveAdsText(element, false)
                })
            } else {
                setLocalStorageItem(AUTO_REMOVE_ADS_STATUS, '1', res => {
                    if(!res) throw new Error(`Cannot change local storage item`)

                    execDisableAdsScript(result => {
                        if(!result) throw new Error(`Cannot execute disable ads script`)

                        changeAutoRemoveAdsText(element, true)
                    });
                })
            }
        }
    })
}