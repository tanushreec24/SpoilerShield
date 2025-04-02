chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
      enabled: true,
      keywords: [
        "spoiler", "spoilers", "leaked", "ending", "dies", "death", "reveals", 
        "twist", "finale", "ending explained", "post-credits", "season finale"
      ],
      customKeywords: [],
      blockingMode: "blur", 
      sensitivity: 0.7     
    });
  });