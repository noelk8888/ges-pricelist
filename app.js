// Global state
let productsData = [];
let currentCompanyName = '';
let selectedProducts = new Set(); // Track selected products by code
let isQuoteMode = false; // Track if showing quote or all results

// DOM Elements
const inputSection = document.getElementById('inputSection');
const searchSection = document.getElementById('searchSection');
const companyNameInput = document.getElementById('companyNameInput');
const startBtn = document.getElementById('startBtn');
const companyDisplay = document.getElementById('companyDisplay');
const changeNameBtn = document.getElementById('changeNameBtn');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const resultsContainer = document.getElementById('resultsContainer');
const selectionCount = document.getElementById('selectionCount');
const generateQuoteBtn = document.getElementById('generateQuoteBtn');
const showAllBtn = document.getElementById('showAllBtn');

// Load product data
async function loadProductData() {
    try {
        const response = await fetch('data.json');
        productsData = await response.json();
        console.log(`Loaded ${productsData.length} products`);
    } catch (error) {
        console.error('Error loading product data:', error);
        alert('Failed to load product data. Please refresh the page.');
    }
}

// Initialize
loadProductData();

// Start button click
startBtn.addEventListener('click', () => {
    const companyName = companyNameInput.value.trim().toUpperCase();
    if (companyName) {
        currentCompanyName = companyName;
        companyDisplay.textContent = currentCompanyName;
        inputSection.style.display = 'none';
        searchSection.style.display = 'block';
        searchInput.focus();
    } else {
        alert('Please enter a company name');
    }
});

// Enter key on company name input
companyNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startBtn.click();
    }
});

// Change name button
changeNameBtn.addEventListener('click', () => {
    searchSection.style.display = 'none';
    inputSection.style.display = 'block';
    companyNameInput.value = currentCompanyName;
    companyNameInput.select();
    companyNameInput.focus();
    resultsContainer.classList.remove('show');
    searchInput.value = '';
    selectedProducts.clear();
    updateSelectionUI();
});

// Search functionality with improved fuzzy matching
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length >= 2) {
        performSearch(searchTerm);
        isQuoteMode = false;
        showAllBtn.style.display = 'none';
    } else {
        resultsContainer.classList.remove('show');
    }
});

// Clear button
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    resultsContainer.classList.remove('show');
    searchInput.focus();
    selectedProducts.clear();
    updateSelectionUI();
    isQuoteMode = false;
    showAllBtn.style.display = 'none';
});

// Generate Quote button
generateQuoteBtn.addEventListener('click', () => {
    if (selectedProducts.size === 0) return;

    isQuoteMode = true;
    showAllBtn.style.display = 'inline-block';

    // Get selected products
    const selectedItems = productsData.filter(p => selectedProducts.has(p.code));
    displayResults(selectedItems, true);
});

// Show All Results button
showAllBtn.addEventListener('click', () => {
    isQuoteMode = false;
    showAllBtn.style.display = 'none';

    // Re-run last search
    const searchTerm = searchInput.value.trim();
    if (searchTerm.length >= 2) {
        performSearch(searchTerm);
    }
});

// Perform search with improved smart matching
function performSearch(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();

    const results = productsData.filter(product => {
        const codeMatch = product.code.toLowerCase().includes(lowerSearchTerm);
        const descMatch = product.description.toLowerCase().includes(lowerSearchTerm);
        return codeMatch || descMatch;
    }).sort((a, b) => {
        // Smart sorting: prioritize exact code matches, then code partial, then description
        const aCodeLower = a.code.toLowerCase();
        const bCodeLower = b.code.toLowerCase();
        const aDescLower = a.description.toLowerCase();
        const bDescLower = b.description.toLowerCase();

        // Exact code match (highest priority)
        if (aCodeLower === lowerSearchTerm && bCodeLower !== lowerSearchTerm) return -1;
        if (bCodeLower === lowerSearchTerm && aCodeLower !== lowerSearchTerm) return 1;

        // Code starts with search term
        if (aCodeLower.startsWith(lowerSearchTerm) && !bCodeLower.startsWith(lowerSearchTerm)) return -1;
        if (bCodeLower.startsWith(lowerSearchTerm) && !aCodeLower.startsWith(lowerSearchTerm)) return 1;

        // Code contains (but description doesn't)
        const aCodeMatch = aCodeLower.includes(lowerSearchTerm);
        const bCodeMatch = bCodeLower.includes(lowerSearchTerm);
        const aDescMatch = aDescLower.includes(lowerSearchTerm);
        const bDescMatch = bDescLower.includes(lowerSearchTerm);

        if (aCodeMatch && !aDescMatch && (!bCodeMatch || bDescMatch)) return -1;
        if (bCodeMatch && !bDescMatch && (!aCodeMatch || aDescMatch)) return 1;

        // Default alphabetical by code
        return aCodeLower.localeCompare(bCodeLower);
    });

    displayResults(results, false);
}

// Format price with peso sign and /pc
function formatPrice(priceStr) {
    // Remove commas and parse
    const cleanPrice = priceStr.replace(/,/g, '');
    return `₱${priceStr}/pc`;
}

// Update selection UI
function updateSelectionUI() {
    selectionCount.textContent = `Selected: ${selectedProducts.size}/10`;
    generateQuoteBtn.disabled = selectedProducts.size === 0;
}

// Handle checkbox change
function handleCheckboxChange(e, productCode) {
    if (e.target.checked) {
        if (selectedProducts.size >= 10) {
            e.target.checked = false;
            alert('Maximum 10 items can be selected for a quote');
            return;
        }
        selectedProducts.add(productCode);
    } else {
        selectedProducts.delete(productCode);
    }

    updateSelectionUI();

    // Update visual state
    const item = e.target.closest('.result-item');
    if (e.target.checked) {
        item.classList.add('selected');
    } else {
        item.classList.remove('selected');
    }
}

// Display results in copy-paste ready format
function displayResults(results, isQuote = false) {
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No products found</div>';
        resultsContainer.classList.add('show');
        return;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Updated header format: "COMPANY NAME (Dealer's Price)"
    let html = `
        <div class="results-header">
            <div class="company-name">${escapeHtml(currentCompanyName)} (Dealer's Price)</div>
        </div>
        <div class="results-list">
    `;

    results.forEach(product => {
        const isChecked = selectedProducts.has(product.code);
        const selectedClass = isChecked ? 'selected' : '';

        html += `
            <div class="result-item ${selectedClass}">
                ${!isQuote ? `<input type="checkbox" class="result-checkbox" 
                    data-code="${escapeHtml(product.code)}" 
                    ${isChecked ? 'checked' : ''}
                    ${selectedProducts.size >= 5 && !isChecked ? 'disabled' : ''}>` : ''}
                <div class="product-code">${escapeHtml(product.code)}</div>
                <div class="product-description">${escapeHtml(product.description)}</div>
                <div class="product-price">${formatPrice(product.dealerPrice)}</div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="results-footer">
            <div class="footer-disclaimer">
                Prices subject to change. Stocks subject to availability. VAT inclusive. Warranty as specified. (as of ${currentDate})
            </div>
        </div>
        <div class="copy-btn-container">
            <button class="copy-btn" onclick="copyResults()">Copy to Clipboard</button>
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');

    // Add event listeners to checkboxes (only if not in quote mode)
    if (!isQuote) {
        const checkboxes = resultsContainer.querySelectorAll('.result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                handleCheckboxChange(e, checkbox.dataset.code);
            });
        });
    }
}

// Copy results to clipboard as plain text
function copyResults() {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let results;

    // If in quote mode, copy only selected items
    if (isQuoteMode && selectedProducts.size > 0) {
        results = productsData.filter(p => selectedProducts.has(p.code));
    } else {
        // Otherwise copy current search results
        const searchTerm = searchInput.value.trim().toLowerCase();
        results = productsData.filter(product => {
            const codeMatch = product.code.toLowerCase().includes(searchTerm);
            const descMatch = product.description.toLowerCase().includes(searchTerm);
            return codeMatch || descMatch;
        });
    }

    // Build plain text version with new header format
    let textOutput = `${currentCompanyName} (Dealer's Price)\n\n`;

    results.forEach(product => {
        textOutput += `${product.code}\n`;
        textOutput += `${product.description}\n`;
        textOutput += `₱${product.dealerPrice}/pc\n\n`;
    });

    textOutput += `Prices subject to change. Stocks subject to availability. VAT inclusive. Warranty as specified. (as of ${currentDate})`;

    // Copy to clipboard
    navigator.clipboard.writeText(textOutput).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');

        setTimeout(() => {
            btn.textContent = 'Copy to Clipboard';
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please select and copy manually.');
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
