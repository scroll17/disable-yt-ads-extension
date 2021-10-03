const button = document.getElementById('modal');

if(button) {
    button.onclick = function (el) {
        const REMOVE_ADS_STATUS = 'remove-ads-status';

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

                            changeText();
                        }
                    )
                })
            }
        })
    }
}

function changeText() {
    const text = document.getElementById('text')
    text.style.color = 'green';
    text.style.fontWeight = 'bold';
    text.innerText = 'ON'

    console.log('- TEXT -CHANGED -')
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
