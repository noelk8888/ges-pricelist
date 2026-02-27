// Global state
let productsData = [];
let currentCompanyName = '';
let selectedProducts = new Map(); // code → { dl: qty|null, ww: qty|null }
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
const copyBtn = document.getElementById('copyBtn');
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

    const quoteItems = [];
    for (const [code, variants] of selectedProducts) {
        const product = productsData.find(p => p.code === code);
        if (!product) continue;
        if (variants.dl !== null) quoteItems.push({ ...product, _variant: 'dl', _qty: variants.dl });
        if (variants.ww !== null) quoteItems.push({ ...product, _variant: 'ww', _qty: variants.ww });
        if (variants.dl === null && variants.ww === null) {
            quoteItems.push({ ...product, _variant: null, _qty: null });
        }
    }
    displayResults(quoteItems, true);
});

// Copy to Clipboard button
copyBtn.addEventListener('click', () => {
    copyResults();
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
    }, 2000);
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
    return `₱${priceStr}/pc`;
}

// Update selection UI
function updateSelectionUI() {
    selectionCount.textContent = `Selected: ${selectedProducts.size}/20`;
    generateQuoteBtn.disabled = selectedProducts.size === 0;
}

// Handle checkbox change
function handleCheckboxChange(e, productCode) {
    if (e.target.checked) {
        if (selectedProducts.size >= 20) {
            e.target.checked = false;
            alert('Maximum 20 items can be selected for a quote');
            return;
        }
        selectedProducts.set(productCode, { dl: null, ww: null });
    } else {
        selectedProducts.delete(productCode);
    }

    updateSelectionUI();

    const item = e.target.closest('.result-item');
    const panel = item.querySelector('.color-qty-panel');
    if (e.target.checked) {
        item.classList.add('selected');
        if (panel) panel.style.display = 'flex';
    } else {
        item.classList.remove('selected');
        if (panel) panel.style.display = 'none';
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

    let html = `
        <div class="results-header">
            <div class="company-name">${escapeHtml(currentCompanyName)} (Dealer's Price)</div>
        </div>
        <div class="results-list">
    `;

    results.forEach(product => {
        if (isQuote) {
            const suffix = product._variant ? '-' + product._variant.toUpperCase() : '';
            html += `
                <div class="result-item quote-item">
                    ${product._qty ? `<div class="item-qty">${product._qty} PCS</div>` : ''}
                    <div class="product-code">${escapeHtml(product.code)}${suffix}</div>
                    <div class="product-description">${escapeHtml(formatDescriptionForCopy(product.description))}</div>
                    <div class="product-price">${formatPrice(product.dealerPrice)}</div>
                </div>
            `;
        } else {
            const isChecked = selectedProducts.has(product.code);
            const selectedClass = isChecked ? 'selected' : '';
            const variants = selectedProducts.get(product.code) || { dl: null, ww: null };
            const dlChecked = variants.dl !== null;
            const wwChecked = variants.ww !== null;
            const code = escapeHtml(product.code);

            html += `
                <div class="result-item ${selectedClass}">
                    <input type="checkbox" class="result-checkbox"
                        data-code="${code}"
                        ${isChecked ? 'checked' : ''}
                        ${selectedProducts.size >= 20 && !isChecked ? 'disabled' : ''}>
                    <div class="product-code">${code}</div>
                    <div class="product-description">${escapeHtml(product.description)}</div>
                    <div class="product-price">${formatPrice(product.dealerPrice)}</div>
                    <div class="color-qty-panel"${isChecked ? '' : ' style="display:none"'}>
                        <div class="color-row">
                            <label class="color-label">
                                <input type="checkbox" class="color-check" data-color="dl" data-code="${code}" ${dlChecked ? 'checked' : ''}>
                                <span class="color-tag dl-tag">DL</span>
                            </label>
                            <input type="number" class="qty-input" data-color="dl" data-code="${code}"
                                min="1" value="${variants.dl || ''}" placeholder="qty"${dlChecked ? '' : ' style="display:none"'}>
                        </div>
                        <div class="color-row">
                            <label class="color-label">
                                <input type="checkbox" class="color-check" data-color="ww" data-code="${code}" ${wwChecked ? 'checked' : ''}>
                                <span class="color-tag ww-tag">WW</span>
                            </label>
                            <input type="number" class="qty-input" data-color="ww" data-code="${code}"
                                min="1" value="${variants.ww || ''}" placeholder="qty"${wwChecked ? '' : ' style="display:none"'}>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    html += `
        </div>
        <div class="results-footer">
            <div class="footer-disclaimer">
                Prices subject to change. Stocks subject to availability. VAT inclusive. Warranty as specified. Price valid as of ${currentDate}.
            </div>
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');

    if (!isQuote) {
        resultsContainer.querySelectorAll('.result-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                handleCheckboxChange(e, checkbox.dataset.code);
            });
        });

        resultsContainer.querySelectorAll('.color-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const code = e.target.dataset.code;
                const color = e.target.dataset.color;
                const row = e.target.closest('.color-row');
                const qtyInput = row.querySelector('.qty-input');
                const variants = selectedProducts.get(code) || { dl: null, ww: null };

                if (e.target.checked) {
                    qtyInput.style.display = 'inline-block';
                    qtyInput.focus();
                } else {
                    qtyInput.style.display = 'none';
                    qtyInput.value = '';
                    variants[color] = null;
                    selectedProducts.set(code, variants);
                }
                updateSelectionUI();
            });
        });

        resultsContainer.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const code = e.target.dataset.code;
                const color = e.target.dataset.color;
                const qty = parseInt(e.target.value);
                const variants = selectedProducts.get(code) || { dl: null, ww: null };
                variants[color] = qty > 0 ? qty : null;
                selectedProducts.set(code, variants);
                updateSelectionUI();
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

    // Build plain text version
    let textOutput = `${currentCompanyName} (Dealer's Price)\n========\n\n`;

    if (isQuoteMode && selectedProducts.size > 0) {
        for (const [code, variants] of selectedProducts) {
            const product = productsData.find(p => p.code === code);
            if (!product) continue;
            const desc = formatDescriptionForCopy(product.description);

            const entries = [];
            if (variants.dl !== null) entries.push({ suffix: '-DL', qty: variants.dl });
            if (variants.ww !== null) entries.push({ suffix: '-WW', qty: variants.ww });
            if (entries.length === 0) entries.push({ suffix: '', qty: null });

            for (const entry of entries) {
                if (entry.qty) textOutput += `${entry.qty} PCS\n`;
                textOutput += `${code}${entry.suffix}\n`;
                textOutput += `${desc}\n`;
                textOutput += `₱${product.dealerPrice}/pc\n\n`;
            }
        }
    } else {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const results = productsData.filter(product => {
            const codeMatch = product.code.toLowerCase().includes(searchTerm);
            const descMatch = product.description.toLowerCase().includes(searchTerm);
            return codeMatch || descMatch;
        });
        results.forEach(product => {
            textOutput += `${product.code}\n`;
            textOutput += `${formatDescriptionForCopy(product.description)}\n`;
            textOutput += `₱${product.dealerPrice}/pc\n\n`;
        });
    }

    textOutput += `Prices subject to change. Stocks subject to availability. VAT inclusive. Warranty as specified. Price valid as of ${currentDate}.`;

    // Copy to clipboard
    navigator.clipboard.writeText(textOutput).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please select and copy manually.');
    });
}

// Format description for copied text: remove colors, shorten warranty
function formatDescriptionForCopy(description) {
    const yrs = (n) => n === '1' ? '1yr' : `${n}yrs`;

    if (!description) return '(1yr warranty)';

    // Match color section (Daylight / Cool White / Warm White variants) right before warranty
    const colorWarrantyRe = /\s*(?:(?:Daylight|Cool\s+[Ww]hite|Warm\s+[Ww]hite|White)\/?)+\s*(\d+)\s*years?\s+warranty/i;
    let match = description.match(colorWarrantyRe);
    if (match) {
        const spec = description.replace(colorWarrantyRe, '').trim();
        return `${spec} (${yrs(match[1])} warranty)`;
    }

    // Handle warranty with no preceding color section
    const warrantyRe = /\s*(\d+)\s*years?\s+warranty/i;
    match = description.match(warrantyRe);
    if (match) {
        const spec = description.replace(warrantyRe, '').trim();
        return spec ? `${spec} (${yrs(match[1])} warranty)` : `(${yrs(match[1])} warranty)`;
    }

    // No warranty info found — default to 1yr
    return `${description} (1yr warranty)`.trim();
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Upload Modal ---
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const docxFileInput = document.getElementById('docxFileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const uploadDocxBtn = document.getElementById('uploadDocxBtn');
const uploadStatus = document.getElementById('uploadStatus');

openUploadBtn.addEventListener('click', () => {
    uploadModal.classList.add('open');
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';
    docxFileInput.value = '';
    fileNameDisplay.textContent = 'No file chosen';
    uploadDocxBtn.disabled = true;
});

closeModalBtn.addEventListener('click', () => {
    uploadModal.classList.remove('open');
});

uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.classList.remove('open');
    }
});

docxFileInput.addEventListener('change', () => {
    const file = docxFileInput.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        uploadDocxBtn.disabled = false;
    } else {
        fileNameDisplay.textContent = 'No file chosen';
        uploadDocxBtn.disabled = true;
    }
});

uploadDocxBtn.addEventListener('click', async () => {
    const file = docxFileInput.files[0];
    if (!file) return;

    uploadDocxBtn.disabled = true;
    uploadDocxBtn.textContent = 'Uploading...';
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            uploadStatus.textContent = `✓ ${result.message}`;
            uploadStatus.className = 'upload-status success';
            await loadProductData();
        } else {
            uploadStatus.textContent = `✗ ${result.error}`;
            uploadStatus.className = 'upload-status error';
        }
    } catch {
        uploadStatus.textContent = '✗ Upload failed. Make sure you started the app with server.py, not python3 -m http.server.';
        uploadStatus.className = 'upload-status error';
    }

    uploadDocxBtn.disabled = false;
    uploadDocxBtn.textContent = 'Upload & Update';
});
