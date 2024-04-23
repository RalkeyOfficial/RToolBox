// popup.js
document.addEventListener("DOMContentLoaded", () => {
    // Get the current tab to determine the website's hostname
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const hostname = url.hostname;

        // Send a request to the background script to get features for this hostname
        chrome.runtime.sendMessage(
            { request: "getFeatures", website: hostname }, // Include the hostname in the request
            (response) => {
                const featureList = $("#featureList");
                const features = response.features || []; // Assuming the background script sends features for this hostname

                // Only proceed if there are features to add
                if (features.length === 0) {
                    return;
                }

                featureList.html("");

                // Populate the feature list in the popup
                features.forEach((feature) => {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.id = feature.name;
                    if (feature.enabled) checkbox.checked = feature.enabled;

                    // Handle checkbox changes to update feature state
                    checkbox.addEventListener("change", (event) => {
                        chrome.runtime.sendMessage({
                            website: hostname, // Include the hostname when updating a feature
                            featureName: feature.name,
                            enabled: event.target.checked,
                        });
                    });

                    const label = document.createElement("label");
                    label.htmlFor = feature.name;
                    label.innerText = feature.name;

                    const container = document.createElement("div");
                    container.appendChild(checkbox);
                    container.appendChild(label);

                    featureList.append(container);
                });
            }
        );
    });
});
