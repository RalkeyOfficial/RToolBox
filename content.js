// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleFeature") {
        if (message.enabled) window[message.enable]();
        else window[message.disable]();
    }
});

const hostname = new URL(window.location.href).hostname;

console.log(hostname);

// Send a request to the background script to get features for this hostname
chrome.runtime.sendMessage(
    { request: "getFeatures", website: hostname }, // Include the hostname in the request
    (response) => {
        const features = response.features || [];

        features.forEach((feature) => {
            if (feature.enabled) window[feature.enable]();
            else window[feature.disable]();
        });
    }
);
