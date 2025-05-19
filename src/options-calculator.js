document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calculateBtn = document.getElementById('calculate');
    const optionTypeSelect = document.getElementById('optionType');
    const stockPriceInput = document.getElementById('stockPrice');
    const strikePriceInput = document.getElementById('strikePrice');
    const daysToExpiryInput = document.getElementById('daysToExpiry');
    const volatilityInput = document.getElementById('volatility');
    const interestRateInput = document.getElementById('interestRate');
    
    // Result elements
    const optionPriceEl = document.getElementById('optionPrice');
    const deltaEl = document.getElementById('delta');
    const gammaEl = document.getElementById('gamma');
    const thetaEl = document.getElementById('theta');
    const vegaEl = document.getElementById('vega');
    const rhoEl = document.getElementById('rho');

    // Constants
    const DAYS_IN_YEAR = 365;
    const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);

    // Standard normal probability density function
    function normalPDF(x) {
        return Math.exp(-0.5 * x * x) / SQRT_TWO_PI;
    }


    // Standard normal cumulative distribution function
    function normalCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * y);
    }


    // Calculate d1 and d2 for Black-Scholes
    function calculateD1D2(S, K, T, r, sigma) {
        const t = T / DAYS_IN_YEAR; // Convert days to years
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
        const d2 = d1 - sigma * Math.sqrt(t);
        return { d1, d2 };
    }

    // Calculate option price using Black-Scholes model
    function calculateOptionPrice(type, S, K, T, r, sigma) {
        const { d1, d2 } = calculateD1D2(S, K, T, r, sigma);
        const t = T / DAYS_IN_YEAR;
        
        if (type === 'call') {
            return S * normalCDF(d1) - K * Math.exp(-r * t) * normalCDF(d2);
        } else {
            return K * Math.exp(-r * t) * normalCDF(-d2) - S * normalCDF(-d1);
        }
    }


    // Calculate option Greeks
    function calculateGreeks(type, S, K, T, r, sigma) {
        const { d1, d2 } = calculateD1D2(S, K, T, r, sigma);
        const t = T / DAYS_IN_YEAR;
        
        // Delta
        let delta;
        if (type === 'call') {
            delta = normalCDF(d1);
        } else {
            delta = normalCDF(d1) - 1;
        }
        
        // Gamma (same for calls and puts)
        const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(t));
        
        // Theta (per day)
        let theta;
        const term1 = -S * normalPDF(d1) * sigma / (2 * Math.sqrt(t)) / DAYS_IN_YEAR;
        if (type === 'call') {
            theta = term1 - r * K * Math.exp(-r * t) * normalCDF(d2) / DAYS_IN_YEAR;
        } else {
            theta = term1 + r * K * Math.exp(-r * t) * normalCDF(-d2) / DAYS_IN_YEAR;
        }
        
        // Vega (per 1% change in vol)
        const vega = S * Math.sqrt(t) * normalPDF(d1) * 0.01;
        
        // Rho (per 1% change in rate)
        let rho;
        if (type === 'call') {
            rho = K * t * Math.exp(-r * t) * normalCDF(d2) / 100;
        } else {
            rho = -K * t * Math.exp(-r * t) * normalCDF(-d2) / 100;
        }
        
        return { delta, gamma, theta, vega, rho };
    }

    // Format number to 4 decimal places
    function formatNumber(num) {
        if (num === null || isNaN(num)) return '-';
        return num.toFixed(4);
    }

    // Main calculation function
    function calculate() {
        // Get input values
        const type = optionTypeSelect.value;
        const S = parseFloat(stockPriceInput.value);
        const K = parseFloat(strikePriceInput.value);
        const T = parseFloat(daysToExpiryInput.value);
        const r = parseFloat(interestRateInput.value) / 100; // Convert percentage to decimal
        const sigma = parseFloat(volatilityInput.value) / 100; // Convert percentage to decimal
        
        // Validate inputs
        if (isNaN(S) || isNaN(K) || isNaN(T) || isNaN(r) || isNaN(sigma) || T <= 0) {
            alert('Please enter valid values for all fields');
            return;
        }
        
        try {
            // Calculate option price and Greeks
            const price = calculateOptionPrice(type, S, K, T, r, sigma);
            const { delta, gamma, theta, vega, rho } = calculateGreeks(type, S, K, T, r, sigma);
            
            // Update UI with results
            optionPriceEl.textContent = `$${price.toFixed(2)}`;
            deltaEl.textContent = formatNumber(delta);
            gammaEl.textContent = formatNumber(gamma);
            thetaEl.textContent = formatNumber(theta);
            vegaEl.textContent = formatNumber(vega);
            rhoEl.textContent = formatNumber(rho);
            
        } catch (error) {
            console.error('Error in calculation:', error);
            alert('An error occurred during calculation. Please check your inputs.');
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Also calculate when Enter is pressed in any input
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    // Initial calculation
    calculate();
});
