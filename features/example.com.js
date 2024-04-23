let originalBG = $("body").css("background-color");

// change background
function ExampleCom_EnableDarkBackground() {
    $("body").css("background-color", "black");
}

function ExampleCom_DisableDarkBackground() {
    $("body").css("background-color", originalBG);
}

// make example website EVIL
function ExampleCom_EnableEvilExample() {
    $("h1").text("Anti-Example Domain");
}

function ExampleCom_DisableEvilExample() {
    $("h1").text("Example Domain");
}

// Register feature in a central registry
chrome.runtime.sendMessage({
    action: "registerFeatures",
    website: "example.com",
    features: [
        {
            name: "Dark Background",
            enable: "ExampleCom_EnableDarkBackground",
            disable: "ExampleCom_DisableDarkBackground",
        },
        {
            name: "Evil example domain",
            enable: "ExampleCom_EnableEvilExample",
            disable: "ExampleCom_DisableEvilExample",
        },
    ],
});
