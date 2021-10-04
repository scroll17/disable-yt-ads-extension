window.onload = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.executeScript(
            tabs[0].id,
            {
                code: `(() => window.__remove_yt_ads)()`
            },
            result => {
                const res = Boolean(result[0]);

                if(res) {
                    const text = document.getElementById('text')
                    text.style.color = 'green';
                    text.style.fontWeight = 'bold';
                    text.innerText = 'ON'
                }
            }
        )
    })
}