document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fetchButton = document.getElementById('fetchData');
    const stockSymbolInput = document.getElementById('stockSymbol');
    const stockPriceEl = document.getElementById('stockPrice');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const toggleSettingsButton = document.getElementById('toggleSettings');
    const settingsContent = document.getElementById('settingsContent');
    
    // Tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Cash Secured Puts
    const putStrikeInput = document.getElementById('putStrike');
    const putPremiumInput = document.getElementById('putPremium');
    const putContractsInput = document.getElementById('putContracts');
    const putExpirationInput = document.getElementById('putExpiration');
    const calculatePutButton = document.getElementById('calculatePut');
    const putTotalPremiumEl = document.getElementById('putTotalPremium');
    const putCashRequiredEl = document.getElementById('putCashRequired');
    const putRoiEl = document.getElementById('putRoi');
    const putDaysToExpEl = document.getElementById('putDaysToExp');
    const putAnnualizedRoiEl = document.getElementById('putAnnualizedRoi');
    
    // Covered Calls
    const callStrikeInput = document.getElementById('callStrike');
    const callPremiumInput = document.getElementById('callPremium');
    const callContractsInput = document.getElementById('callContracts');
    const callExpirationInput = document.getElementById('callExpiration');
    const sharesOwnedInput = document.getElementById('sharesOwned');
    const alreadyOwnSharesCheckbox = document.getElementById('alreadyOwnShares');
    const purchasePriceGroup = document.getElementById('purchasePriceGroup');
    const purchasePriceInput = document.getElementById('purchasePrice');
    const calculateCallButton = document.getElementById('calculateCall');
    const callTotalPremiumEl = document.getElementById('callTotalPremium');
    const callMaxProfitEl = document.getElementById('callMaxProfit');
    const callRoiEl = document.getElementById('callRoi');
    const callDaysToExpEl = document.getElementById('callDaysToExp');
    const callAnnualizedRoiEl = document.getElementById('callAnnualizedRoi');
    const callCostBasisInfo = document.getElementById('callCostBasisInfo');
    const callCostBasisEl = document.getElementById('callCostBasis');
    
    // Finnhub API configuration
    const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
    let finnhubApiKey = '';
    let currentStockPrice = 0;
    
    // Set default expiration date to next Friday
    function setDefaultExpirationDate() {
        const today = new Date();
        const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7; // Next Friday
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + daysUntilFriday);
        
        const formattedDate = nextFriday.toISOString().split('T')[0];
        putExpirationInput.value = formattedDate;
        callExpirationInput.value = formattedDate;
    }
    
    // Calculate days between two dates
    function daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        return Math.round(Math.abs((date1 - date2) / oneDay));
    }
    
    // Annualize return
    function annualizeReturn(returnPercentage, days) {
        if (days <= 0) return 0;
        const years = days / 365;
        return (Math.pow(1 + (returnPercentage / 100), 1 / years) - 1) * 100;
    }
    
    // Load API key from local storage
    function loadApiKey() {
        chrome.storage.local.get(['finnhubApiKey'], function(result) {
            if (result.finnhubApiKey) {
                finnhubApiKey = result.finnhubApiKey;
                apiKeyInput.value = '••••••••••••••••••••';
            } else {
                settingsContent.classList.add('visible');
            }
        });
    }
    
    // Save API key to local storage
    function saveApiKey() {
        const key = apiKeyInput.value.trim();
        if (key && key !== '••••••••••••••••••••') {
            finnhubApiKey = key;
            chrome.storage.local.set({ finnhubApiKey: key }, function() {
                showMessage('API key saved successfully!', 'success');
                apiKeyInput.value = '••••••••••••••••••••';
            });
        }
    }
    
    // Format currency
    function formatCurrency(amount) {
        if (isNaN(amount)) return '$0.00';
        return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Format percentage
    function formatPercentage(amount) {
        if (isNaN(amount)) return '0.00%';
        return parseFloat(amount).toFixed(2) + '%';
    }
    
    // Show loading state
    function showLoading() {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
    }
    
    // Hide loading state
    function hideLoading() {
        loadingEl.style.display = 'none';
    }
    
    // Show error message
    function showError(message) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    
    // Show success message
    function showMessage(message, type = 'success') {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        errorEl.style.color = type === 'success' ? '#28a745' : '#dc3545';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
            errorEl.style.color = '';
        }, 3000);
    }
    
    // Clear error
    function clearError() {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    
    // Fetch stock price
    async function fetchStockPrice(symbol) {
        if (!finnhubApiKey) {
            showError('Please set your Finnhub API key in settings');
            settingsContent.classList.add('visible');
            throw new Error('API key not set');
        }
        
        try {
            const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${finnhubApiKey}`);
            
            if (response.status === 403) {
                throw new Error('Invalid or missing API key');
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch stock price');
            }
            
            const data = await response.json();
            return data.c; // Current price
        } catch (error) {
            console.error('Error fetching stock price:', error);
            if (error.message.includes('API key')) {
                showError('Invalid API key. Please check your Finnhub API key in settings.');
                settingsContent.classList.add('visible');
            } else {
                showError('Failed to fetch stock price. ' + error.message);
            }
            throw error;
        }
    }
    
    // Calculate Cash Secured Put returns
    function calculatePutReturns() {
        const strike = parseFloat(putStrikeInput.value) || 0;
        const premium = parseFloat(putPremiumInput.value) || 0;
        const contracts = parseInt(putContractsInput.value) || 1;
        const expirationDate = new Date(putExpirationInput.value);
        const today = new Date();
        
        if (strike <= 0 || premium < 0 || contracts <= 0) {
            showError('Please enter valid values for strike price, premium, and contracts');
            return;
        }
        
        // Calculate days to expiration
        const daysToExpiration = daysBetween(today, expirationDate);
        
        const totalPremium = premium * 100 * contracts;
        const cashRequired = strike * 100 * contracts;
        const roi = (totalPremium / cashRequired) * 100;
        const annualizedRoi = annualizeReturn(roi, daysToExpiration);
        
        // Update UI
        putTotalPremiumEl.textContent = formatCurrency(totalPremium);
        putCashRequiredEl.textContent = formatCurrency(cashRequired);
        putRoiEl.textContent = formatPercentage(roi);
        putDaysToExpEl.textContent = daysToExpiration;
        putAnnualizedRoiEl.textContent = formatPercentage(annualizedRoi);
    }
    
    // Calculate Covered Call returns
    function calculateCallReturns() {
        const strike = parseFloat(callStrikeInput.value) || 0;
        const premium = parseFloat(callPremiumInput.value) || 0;
        const contracts = parseInt(callContractsInput.value) || 1;
        const shares = parseInt(sharesOwnedInput.value) || 100;
        const expirationDate = new Date(callExpirationInput.value);
        const today = new Date();
        const alreadyOwnShares = alreadyOwnSharesCheckbox.checked;
        const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
        
        if (strike <= 0 || premium < 0 || contracts <= 0 || shares <= 0) {
            showError('Please enter valid values for strike price, premium, contracts, and shares');
            return;
        }
        
        // Calculate days to expiration
        const daysToExpiration = daysBetween(today, expirationDate);
        
        const totalPremium = premium * 100 * contracts;
        const sharesPerContract = 100;
        const totalShares = contracts * sharesPerContract;
        
        let maxProfit, roi, costBasis;
        
        if (alreadyOwnShares) {
            // If already own shares, calculate based on purchase price
            costBasis = purchasePrice * shares;
            const saleProceeds = strike * shares;
            const profitFromSale = saleProceeds - costBasis;
            maxProfit = profitFromSale + totalPremium;
            roi = (maxProfit / costBasis) * 100;
            
            // Show cost basis info
            callCostBasisInfo.style.display = 'flex';
            callCostBasisEl.textContent = formatCurrency(purchasePrice);
        } else {
            // If not owning shares, calculate based on current price
            const costToBuyShares = currentStockPrice * shares;
            const saleProceeds = strike * shares;
            const profitFromSale = saleProceeds - costToBuyShares;
            maxProfit = profitFromSale + totalPremium;
            roi = (totalPremium / costToBuyShares) * 100;
            
            // Hide cost basis info
            callCostBasisInfo.style.display = 'none';
        }
        
        const annualizedRoi = annualizeReturn(roi, daysToExpiration);
        
        // Update UI
        callTotalPremiumEl.textContent = formatCurrency(totalPremium);
        callMaxProfitEl.textContent = formatCurrency(maxProfit);
        callRoiEl.textContent = formatPercentage(roi);
        callDaysToExpEl.textContent = daysToExpiration;
        callAnnualizedRoiEl.textContent = formatPercentage(annualizedRoi);
    }
    
    // Main function to fetch and display data
    async function fetchAndDisplayData() {
        if (!finnhubApiKey) {
            showError('Please set your Finnhub API key in settings');
            settingsContent.classList.add('visible');
            return;
        }
        
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        
        if (!symbol) {
            showError('Please enter a stock symbol');
            return;
        }
        
        showLoading();
        clearError();
        
        try {
            const price = await fetchStockPrice(symbol);
            currentStockPrice = price;
            stockPriceEl.textContent = `Current Price: ${formatCurrency(price)}`;
            
            // Auto-fill strike prices with current price if empty
            if (!putStrikeInput.value) putStrikeInput.value = price.toFixed(2);
            if (!callStrikeInput.value) callStrikeInput.value = (price * 1.05).toFixed(2);
            
            // Calculate if we have premium values
            if (putPremiumInput.value) calculatePutReturns();
            if (callPremiumInput.value) calculateCallReturns();
            
        } catch (error) {
            // Error is already handled in the fetch function
        } finally {
            hideLoading();
        }
    }
    
    // Initialize the application
    function init() {
        // Set default expiration date
        setDefaultExpirationDate();
        
        // Load saved API key
        loadApiKey();
        
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                const tabId = button.getAttribute('data-tab');
                button.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Toggle settings panel
        toggleSettingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsContent.classList.toggle('visible');
        });
        
        // Toggle purchase price field based on checkbox
        alreadyOwnSharesCheckbox.addEventListener('change', function() {
            purchasePriceGroup.style.display = this.checked ? 'block' : 'none';
            if (this.checked && callPremiumInput.value) {
                calculateCallReturns();
            }
        });
        
        // Save API key
        saveApiKeyButton.addEventListener('click', saveApiKey);
        
        // Allow saving with Enter key
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveApiKey();
            }
        });
        
        // Event listeners for data fetching
        fetchButton.addEventListener('click', fetchAndDisplayData);
        stockSymbolInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchAndDisplayData();
            }
        });
        
        // Event listeners for calculations
        calculatePutButton.addEventListener('click', calculatePutReturns);
        calculateCallButton.addEventListener('click', calculateCallReturns);
        
        // Auto-calculate when inputs change
        [putStrikeInput, putPremiumInput, putContractsInput, putExpirationInput].forEach(input => {
            input.addEventListener('change', calculatePutReturns);
        });
        
        [callStrikeInput, callPremiumInput, callContractsInput, callExpirationInput, 
         sharesOwnedInput, purchasePriceInput].forEach(input => {
            input.addEventListener('change', calculateCallReturns);
        });
        
        // Hide API key input when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsContent.contains(e.target) && e.target !== toggleSettingsButton) {
                settingsContent.classList.remove('visible');
            }
        });
        
        // Initial fetch for default symbol
        if (stockSymbolInput.value) {
            fetchAndDisplayData();
        }
    }
    
    // Start the application
    init();
});
