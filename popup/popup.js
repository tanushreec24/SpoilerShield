document.addEventListener('DOMContentLoaded', function() {
    const enableToggle = document.getElementById('enableToggle');
    const statusText = document.getElementById('statusText');
    const blockingMode = document.getElementById('blockingMode');
    const sensitivity = document.getElementById('sensitivity');
    const sensitivityValue = document.getElementById('sensitivityValue');
    const defaultKeywordsContainer = document.getElementById('defaultKeywords');
    const customKeywordsContainer = document.getElementById('customKeywords');
    const newKeywordInput = document.getElementById('newKeyword');
    const addKeywordButton = document.getElementById('addKeyword');
    const resetButton = document.getElementById('resetButton');
    
    chrome.storage.local.get(['enabled', 'keywords', 'customKeywords', 'blockingMode', 'sensitivity'], function(result) {
      enableToggle.checked = result.enabled;
      statusText.textContent = result.enabled ? 'Enabled' : 'Disabled';
     
      blockingMode.value = result.blockingMode;

      sensitivity.value = result.sensitivity * 10;
      sensitivityValue.textContent = result.sensitivity * 10;
      
      displayKeywords(result.keywords, defaultKeywordsContainer, false);
      displayKeywords(result.customKeywords, customKeywordsContainer, true);
    });
    
    enableToggle.addEventListener('change', function() {
      const isEnabled = enableToggle.checked;
      statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
      chrome.storage.local.set({ enabled: isEnabled });
    });
    
    blockingMode.addEventListener('change', function() {
      chrome.storage.local.set({ blockingMode: blockingMode.value });
    });
    
    sensitivity.addEventListener('input', function() {
      const value = sensitivity.value;
      sensitivityValue.textContent = value;
      chrome.storage.local.set({ sensitivity: value / 10 });
    });
    
    addKeywordButton.addEventListener('click', function() {
      addCustomKeyword();
    });
    
    newKeywordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addCustomKeyword();
      }
    });

    resetButton.addEventListener('click', function() {
      chrome.storage.local.set({
        enabled: true,
        keywords: [
          "spoiler", "spoilers", "leaked", "ending", "dies", "death", "reveals", 
          "twist", "finale", "ending explained", "post-credits", "season finale"
        ],
        customKeywords: [],
        blockingMode: "blur",
        sensitivity: 0.7
      }, function() {
        window.location.reload();
      });
    });
    
    function addCustomKeyword() {
      const keyword = newKeywordInput.value.trim();
      if (keyword) {
        chrome.storage.local.get(['customKeywords'], function(result) {
          const customKeywords = result.customKeywords || [];
          if (!customKeywords.includes(keyword)) {
            customKeywords.push(keyword);
            chrome.storage.local.set({ customKeywords: customKeywords }, function() {
              newKeywordInput.value = '';

              displayKeywords(customKeywords, customKeywordsContainer, true);
            });
          }
        });
      }
    }
    
    function displayKeywords(keywords, container, removable) {
      container.innerHTML = '';
      
      if (!keywords || keywords.length === 0) {
        container.innerHTML = '<em style="color: #888;">No keywords</em>';
        return;
      }
      
      keywords.forEach(function(keyword) {
        const tag = document.createElement('span');
        tag.className = removable ? 'keyword-tag custom' : 'keyword-tag';
        
        if (removable) {
          tag.innerHTML = keyword + '<button class="remove-keyword" data-keyword="' + keyword + '">×</button>';
        } else {
          tag.textContent = keyword;
        }
        
        container.appendChild(tag);
      });
      
      if (removable) {
        const removeButtons = container.querySelectorAll('.remove-keyword');
        removeButtons.forEach(function(button) {
          button.addEventListener('click', function() {
            const keywordToRemove = this.getAttribute('data-keyword');
            removeCustomKeyword(keywordToRemove);
          });
        });
      }
    }
    
    function removeCustomKeyword(keyword) {
      chrome.storage.local.get(['customKeywords'], function(result) {
        const customKeywords = result.customKeywords || [];
        const index = customKeywords.indexOf(keyword);
        
        if (index !== -1) {
          customKeywords.splice(index, 1);
          chrome.storage.local.set({ customKeywords: customKeywords }, function() {
            displayKeywords(customKeywords, customKeywordsContainer, true);
          });
        }
      });
    }
  });