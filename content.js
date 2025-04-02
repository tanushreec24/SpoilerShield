(function() {
  let settings = {
    enabled: true,
    keywords: [],
    customKeywords: [],
    blockingMode: "blur",
    sensitivity: 0.7
  };
  
  chrome.storage.local.get(['enabled', 'keywords', 'customKeywords', 'blockingMode', 'sensitivity'], (result) => {
    settings = {...settings, ...result};
    if (settings.enabled) {
      initSpoilerShield();
    }
  });
  
  chrome.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
      settings[key] = changes[key].newValue;
    }
    
    if (settings.enabled) {
      removeSpoilerShields();
      initSpoilerShield();
    } else {
      removeSpoilerShields();
    }
  });
  
  function initSpoilerShield() {
    scanForSpoilers();
    
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
      });
      
      if (shouldScan) {
        clearTimeout(window.spoilerScanTimeout);
        window.spoilerScanTimeout = setTimeout(() => {
          scanForSpoilers();
        }, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  function scanForSpoilers() {
    scanTextNodes(document.body);
    
    scanImages();
  }
  
  function scanTextNodes(rootNode) {
    if (rootNode.classList && rootNode.classList.contains('spoiler-shield-element')) {
      return;
    }
    
    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {

          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const parent = node.parentNode;
          if (parent.tagName === 'SCRIPT' || 
              parent.tagName === 'STYLE' || 
              parent.tagName === 'NOSCRIPT' ||
              parent.classList.contains('spoiler-shield-element')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
   
    let node;
    while (node = walker.nextNode()) {
      processTextNode(node);
    }
  }
  
  function processTextNode(textNode) {
    if (textNode.parentNode.hasAttribute('data-spoiler-shield') ||
        textNode.parentNode.classList.contains('spoiler-shield-element')) {
      return;
    }
    
    const text = textNode.textContent;
    const allKeywords = [...settings.keywords, ...settings.customKeywords];
    if (!allKeywords.some(keyword => containsKeyword(text.toLowerCase(), keyword.toLowerCase()))) {
      return;
    }
    
    const sentences = splitIntoSentences(text);
    const spoilerSentences = sentences.filter(sentence => 
      allKeywords.some(keyword => containsKeyword(sentence.toLowerCase(), keyword.toLowerCase()))
    );
    
    if (spoilerSentences.length > 0) {
      replaceTextWithShield(textNode, text, spoilerSentences);
    }
  }
  
  function splitIntoSentences(text) {
    return text.split(/([.!?]\s+|\n+)/).reduce((result, part, i, arr) => {
      if (i % 2 === 0) {
        if (part.trim()) {
          if (arr[i + 1]) {
            result.push(part + arr[i + 1]);
          } else {
            result.push(part);
          }
        }
      }
      return result;
    }, []);
  }
  
  function containsKeyword(text, keyword) {
    return new RegExp('\\b' + keyword + '\\b', 'i').test(text);
  }
  
  function replaceTextWithShield(textNode, originalText, spoilerSentences) {
    const fragment = document.createDocumentFragment();
    let remainingText = originalText;
    
    spoilerSentences.forEach(sentence => {
      const index = remainingText.indexOf(sentence);
      if (index === -1) return; 
      
      if (index > 0) {
        fragment.appendChild(document.createTextNode(remainingText.substring(0, index)));
      }
      
      const spoilerSpan = document.createElement('span');
      spoilerSpan.className = 'spoiler-shield-element';
      spoilerSpan.setAttribute('data-spoiler-shield', 'true');
      spoilerSpan.setAttribute('data-original-text', sentence);
      
      if (settings.blockingMode === "blur") {
        spoilerSpan.style.filter = 'blur(5px)';
        spoilerSpan.style.cursor = 'pointer';
        spoilerSpan.textContent = sentence;
        
        const indicator = document.createElement('span');
        indicator.className = 'spoiler-shield-indicator';
        indicator.style.position = 'relative';
        indicator.style.display = 'inline-block';
        indicator.style.marginLeft = '5px';
        indicator.style.color = 'red';
        indicator.style.fontSize = '0.8em';
        indicator.textContent = '(spoiler)';
        indicator.style.cursor = 'pointer';
        
        spoilerSpan.appendChild(indicator);
        
        spoilerSpan.addEventListener('click', function() {
          revealSpoiler(this);
        });
      } else {

        spoilerSpan.style.backgroundColor = '#f0f0f0';
        spoilerSpan.style.padding = '0 4px';
        spoilerSpan.style.borderRadius = '3px';
        spoilerSpan.style.cursor = 'pointer';
        spoilerSpan.textContent = '[Spoiler - Click to reveal]';
        
        spoilerSpan.addEventListener('click', function() {
          revealSpoiler(this);
        });
      }
      
      fragment.appendChild(spoilerSpan);
      remainingText = remainingText.substring(index + sentence.length);
    });
    
    if (remainingText) {
      fragment.appendChild(document.createTextNode(remainingText));
    }
    
    textNode.parentNode.replaceChild(fragment, textNode);
  }
  
  function scanImages() {
    const images = document.querySelectorAll('img:not([data-spoiler-shield])');
    images.forEach((img) => {
      const altText = img.getAttribute('alt') || '';
      const titleText = img.getAttribute('title') || '';
      const allKeywords = [...settings.keywords, ...settings.customKeywords];
      
      const hasSpoiler = allKeywords.some(keyword => 
        containsKeyword(altText.toLowerCase(), keyword.toLowerCase()) || 
        containsKeyword(titleText.toLowerCase(), keyword.toLowerCase())
      );
      
      if (hasSpoiler) {
        applyImageSpoilerShield(img);
      }
    });
  }
  
  function applyImageSpoilerShield(img) {
    img.setAttribute('data-spoiler-shield', 'true');
    
    img.setAttribute('data-original-src', img.getAttribute('src'));
    img.setAttribute('data-original-style', img.getAttribute('style') || '');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'spoiler-shield-img-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = img.width + 'px';
    wrapper.style.height = img.height + 'px';
    
    if (settings.blockingMode === "blur") {
      img.style.filter = 'blur(10px)';
      
      const overlay = document.createElement('div');
      overlay.className = 'spoiler-shield-overlay spoiler-shield-element';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.color = 'white';
      overlay.style.textAlign = 'center';
      overlay.style.cursor = 'pointer';
      overlay.innerHTML = '<div>Potential Spoiler Image<br>Click to reveal</div>';
      
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      wrapper.appendChild(overlay);
      
      overlay.addEventListener('click', function() {
        revealSpoiler(img);
        this.parentNode.removeChild(this);
      });
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'spoiler-shield-placeholder spoiler-shield-element';
      placeholder.style.width = img.width + 'px';
      placeholder.style.height = img.height + 'px';
      placeholder.style.backgroundColor = '#f0f0f0';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.textAlign = 'center';
      placeholder.style.cursor = 'pointer';
      placeholder.innerHTML = '<div>Potential Spoiler Image<br>Click to reveal</div>';
      
      img.parentNode.insertBefore(placeholder, img);
      img.style.display = 'none';
      
      placeholder.addEventListener('click', function() {
        revealSpoiler(img);
        this.parentNode.removeChild(this);
      });
    }
  }
  
  function revealSpoiler(element) {
    if (element.classList.contains('spoiler-shield-element')) {
      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        const textNode = document.createTextNode(originalText);
        element.parentNode.replaceChild(textNode, element);
      } else {
        element.style.filter = '';
        element.style.backgroundColor = '';
        
        const indicator = element.querySelector('.spoiler-shield-indicator');
        if (indicator) {
          element.removeChild(indicator);
        }
        
        element.removeAttribute('data-spoiler-shield');
      }
    } 
    else if (element.tagName === 'IMG') {
      element.style.filter = '';
      element.style.display = '';
      element.removeAttribute('data-spoiler-shield');
      
      if (element.parentNode.classList.contains('spoiler-shield-img-wrapper')) {
        const wrapper = element.parentNode;
        wrapper.parentNode.insertBefore(element, wrapper);
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  }
  
  function removeSpoilerShields() {
    document.querySelectorAll('.spoiler-shield-element').forEach(element => {
      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        const textNode = document.createTextNode(originalText);
        element.parentNode.replaceChild(textNode, element);
      } else {
        element.parentNode.removeChild(element);
      }
    });
    
    document.querySelectorAll('img[data-spoiler-shield]').forEach(img => {
      img.style.filter = '';
      img.style.display = '';
      img.removeAttribute('data-spoiler-shield');
      
      if (img.parentNode.classList.contains('spoiler-shield-img-wrapper')) {
        const wrapper = img.parentNode;
        wrapper.parentNode.insertBefore(img, wrapper);
        wrapper.parentNode.removeChild(wrapper);
      }
    });
    
    document.querySelectorAll('.spoiler-shield-placeholder').forEach(placeholder => {
      placeholder.parentNode.removeChild(placeholder);
    });
  }
})();