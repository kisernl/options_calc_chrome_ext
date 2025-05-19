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
    const putPositionValueEl = document.getElementById('putPositionValue');
    const putPremiumReturnEl = document.getElementById('putPremiumReturn');
    
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
    const callPositionValueEl = document.getElementById('callPositionValue');
    const callTotalReturnEl = document.getElementById('callTotalReturn');
    
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
    
    // Helper function to calculate simple annualized return (non-compounded)
    function calculateAnnualizedReturn(returnPercentage, days) {
        if (days <= 0 || isNaN(returnPercentage) || returnPercentage === 0) return 0;
        // Calculate simple annualized return: (returnPercentage * (365/days))
        return (returnPercentage * (365 / days));
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
        const strikePrice = parseFloat(putStrikeInput.value);
        const premium = parseFloat(putPremiumInput.value);
        const contracts = parseInt(putContractsInput.value) || 1;
        const expirationDate = putExpirationInput.value ? new Date(putExpirationInput.value) : null;
        
        // Clear any previous errors
        clearError();
        
        // Only calculate if we have valid inputs
        if (isNaN(strikePrice) || isNaN(premium) || strikePrice <= 0 || premium <= 0) {
            return; // Don't show error, just return early
        }
        
        const totalPremium = premium * contracts * 100;
        const cashRequired = (strikePrice - premium) * contracts * 100; // Actual cash at risk
        const positionValue = strikePrice * contracts * 100;
        
        // Calculate days to expiration
        let daysToExpiration = 0;
        if (expirationDate) {
            const today = new Date();
            daysToExpiration = Math.max(0, Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)));
        }
        
        // Calculate ROI and annualized ROI
        // ROI = (premium / (strike - premium)) * 100
        const roi = (premium / (strikePrice - premium)) * 100;
        const annualizedRoi = calculateAnnualizedReturn(roi, daysToExpiration || 1);
        
        // Update UI
        putTotalPremiumEl.textContent = formatCurrency(totalPremium);
        putCashRequiredEl.textContent = formatCurrency(cashRequired);
        putRoiEl.textContent = formatPercentage(roi);
        putDaysToExpEl.textContent = daysToExpiration;
        putAnnualizedRoiEl.textContent = formatPercentage(annualizedRoi);
        putPositionValueEl.textContent = formatCurrency(positionValue);
        putPremiumReturnEl.textContent = formatPercentage(roi);
        
        // Scroll results into view
        document.querySelector('#cash-secured-puts .results').scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
        });
    }
    
    // Calculate Covered Call returns
    function calculateCallReturns() {
        const strikePrice = parseFloat(callStrikeInput.value);
        const premium = parseFloat(callPremiumInput.value);
        const contracts = parseInt(callContractsInput.value) || 1;
        const expirationDate = callExpirationInput.value ? new Date(callExpirationInput.value) : null;
        const sharesOwned = alreadyOwnSharesCheckbox.checked ? (parseInt(sharesOwnedInput.value) || 0) : 0;
        const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
        
        // Clear any previous errors
        clearError();
        
        // Only calculate if we have valid inputs
        if (isNaN(strikePrice) || isNaN(premium) || strikePrice <= 0 || premium <= 0) {
            return; // Don't show error, just return early
        }
        
        // Additional validation for covered calls with owned shares
        if (alreadyOwnSharesCheckbox.checked && (isNaN(purchasePrice) || purchasePrice <= 0)) {
            return; // Don't show error, just return early
        }
        
        const totalPremium = premium * contracts * 100;
        const sharesPerContract = 100;
        const totalShares = contracts * sharesPerContract;
        
        // Calculate position value (cost of shares at current or purchase price)
        const positionValue = alreadyOwnSharesCheckbox.checked 
            ? purchasePrice * totalShares 
            : currentStockPrice * totalShares;
            
        // Calculate days to expiration
        let daysToExpiration = 0;
        if (expirationDate) {
            const today = new Date();
            daysToExpiration = Math.max(0, Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)));
        }
        
        // Calculate max profit, total return, and ROI
        let maxProfit, totalReturn, roi, roiDenominator;
        
        if (alreadyOwnSharesCheckbox.checked) {
            // If already own shares
            const profitPerShare = (strikePrice - purchasePrice) + premium;
            maxProfit = profitPerShare * totalShares;
            totalReturn = (profitPerShare / purchasePrice) * 100;
            
            // ROI = premium / purchasePrice (since shares are already owned)
            roi = (premium / purchasePrice) * 100;
        } else {
            // If selling covered call without owning (cash-secured call)
            const profitPerShare = (strikePrice - currentStockPrice) + premium;
            maxProfit = profitPerShare * totalShares;
            
            // For cash-secured call, capital at risk is (current price - premium)
            roiDenominator = currentStockPrice - premium;
            roi = (premium / roiDenominator) * 100;
            
            // Total return is profit / investment
            totalReturn = (profitPerShare / currentStockPrice) * 100;
        }
        
        // Calculate annualized ROI based on premium return
        const annualizedRoi = calculateAnnualizedReturn(roi, daysToExpiration || 1);
        
        // Update UI
        callTotalPremiumEl.textContent = formatCurrency(totalPremium);
        callMaxProfitEl.textContent = formatCurrency(maxProfit);
        callRoiEl.textContent = formatPercentage(roi);
        callDaysToExpEl.textContent = daysToExpiration;
        callAnnualizedRoiEl.textContent = formatPercentage(annualizedRoi);
        callPositionValueEl.textContent = formatCurrency(positionValue);
        callTotalReturnEl.textContent = formatPercentage(totalReturn);
        
        // Update cost basis info if shares are already owned
        if (alreadyOwnSharesCheckbox.checked) {
            const costBasis = purchasePrice - premium;
            callCostBasisEl.textContent = formatCurrency(costBasis);
            callCostBasisInfo.style.display = 'flex'; // Changed to flex to match other result items
        } else {
            callCostBasisInfo.style.display = 'none';
        }
        
        // Scroll results into view
        document.querySelector('#covered-calls .results').scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
        });
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
            stockPriceEl.textContent = `Last Price: ${formatCurrency(price)}`;
            
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
