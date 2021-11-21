const REMOVE_ADS_STATUS = 'remove-ads-status';
const AUTO_REMOVE_ADS_STATUS = 'auto-remove-ads-status'

const buttonRemoveAds = document.getElementById('modal');
const buttonAutoRemoveAds = document.getElementById('b-auto-off')

window.onload = () => {
    if(buttonRemoveAds) {
        isScriptExisting(res => {
            if(res) {
                const text = document.getElementById('text')
                text.style.color = 'green';
                text.style.fontWeight = 'bold';
                text.innerText = 'ON'
            }
        })

        buttonRemoveAds.onclick = () => executeDisableAdsScript();
    }
}

if(buttonAutoRemoveAds) {
    chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
        if (changeInfo.status == 'complete' && tab.active) {
            console.debug('- page loaded -')
            toggleAutoRemoveAdsStatus(buttonAutoRemoveAds);
        }
    })

    buttonAutoRemoveAds.onclick = () => {
        const autoRemoveIsOn = localStorage.getItem(AUTO_REMOVE_ADS_STATUS);
        if(Number(autoRemoveIsOn) === 0) {
            localStorage.setItem(AUTO_REMOVE_ADS_STATUS, Number(1).toString())
        } else {
            localStorage.setItem(AUTO_REMOVE_ADS_STATUS, Number(0).toString())
        }

        toggleAutoRemoveAdsStatus(buttonAutoRemoveAds);
    }
}

function isScriptExisting(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.executeScript(
            tabs[0].id,
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

function executeDisableAdsScript() {
    isScriptExisting(res => {
        if(!res) {
            console.log('- EXECUTE -')

            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.executeScript(
                    tabs[0].id,
                    {
                        file: './disable-ads-script.js'
                    },
                    result => {
                        localStorage.setItem(REMOVE_ADS_STATUS, 'on')
                        console.log('disable ads script result => ', result)

                        const text = document.getElementById('text')
                        text.style.color = 'green';
                        text.style.fontWeight = 'bold';
                        text.innerText = 'ON'

                        console.log('- TEXT OF DISABLE STATUS CHANGED -')
                    }
                )
            })
        }
    })
}

function toggleAutoRemoveAdsStatus(element) {
    const autoRemoveIsOn = localStorage.getItem(AUTO_REMOVE_ADS_STATUS);
    if(autoRemoveIsOn) {
        const res = Boolean(Number(autoRemoveIsOn));
        if(res) {
            executeDisableAdsScript();

            element.style.color = 'limegreen';
            element.style.fontWeight = 'bold';
            element.innerText = 'YES'
        } else {
            element.style.color = 'black';
            element.style.fontWeight = undefined;
            element.innerText = 'NO'
        }
    } else {
        localStorage.setItem(AUTO_REMOVE_ADS_STATUS, Number(0).toString())
    }
}