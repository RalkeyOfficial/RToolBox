// background.js
const featureRegistry = {};

function registerFeatures(website, features) {
    if (!featureRegistry[website]) {
        featureRegistry[website] = [];
    }

    // stop if registry is already made
    if (featureRegistry[website][0] !== undefined) return;

    features.forEach((feature) => {
        // check if feature is already registered
        featureRegistry[website].push({
            name: feature.name,
            enable: feature.enable,
            disable: feature.disable,
            enabled: false, // Default state
        });
    });
}

// Function to load feature states from storage (i honestly have no idea what this does specifically)
function loadFeatureStates() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(
            Object.keys(featureRegistry),
            (storedValues) => {
                for (const website in storedValues) {
                    const featureStates = storedValues[website];
                    if (featureRegistry[website]) {
                        featureRegistry[website].forEach((feature, index) => {
                            feature.enabled = featureStates[index];
                        });
                    }
                }
                resolve();
            }
        );
    });
}

// Function to save the states of all features for a website to storage
function saveFeatureStates(website) {
    if (featureRegistry[website]) {
        const stateArray = featureRegistry[website].map(
            (feature) => feature.enabled
        );
        const storageObject = { [website]: stateArray };
        chrome.storage.sync.set(storageObject);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ConsoleLog") {
        console.log(message.message);
    }

    // send features back
    if (message.request === "getFeatures") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = new URL(tabs[0].url);
            const hostname = url.hostname;

            // Load feature states before sending them to the popup
            loadFeatureStates().then(() => {
                const featuresForSite = featureRegistry[hostname] || [];
                sendResponse({ features: featuresForSite });
            });
        });
        return true; // Response will be asynchronous
    }

    // register new features
    if (message.action === "registerFeatures") {
        registerFeatures(message.website, message.features);
    }

    // toggle feature
    if (message.website && message.featureName !== undefined) {
        const { website, featureName, enabled } = message;

        if (featureRegistry[website]) {
            const feature = featureRegistry[website].find(
                (f) => f.name === featureName
            );
            if (feature) {
                feature.enabled = enabled;
                saveFeatureStates(website);

                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    (tabs) => {
                        // Send a message to the active tab's content script
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "toggleFeature",
                            enable: feature.enable,
                            disable: feature.disable,
                            enabled: feature.enabled,
                        });
                    }
                );
            }
        }
    }
});

// Load initial feature states from storage
loadFeatureStates();
