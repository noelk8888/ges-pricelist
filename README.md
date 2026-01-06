# GES Price List Search Application

A web-based price list search tool that allows users to search for products and display dealer prices in a clean, copy-paste ready format.

## Features

- **Dynamic Company Name**: Enter a different company name for each inquiry
- **Smart Search**: Fuzzy matching on product codes and descriptions
- **Clean Display**: Black background with white text matching the reference format
- **Copy-Ready**: Results formatted for easy copy/paste
- **Processing Date**: Automatically includes the current date
- **Disclaimer**: Includes standard pricing disclaimer footer

## Files

- `index.html` - Main application interface
- `style.css` - Styling (dark theme, copy-paste friendly)
- `app.js` - Search logic and clipboard functionality
- `data.json` - Product database (204 items from CENTRON price list)
- `favicon.png` - Browser favicon (GES logo)
- `apple-touch-icon.png` - iPhone/iPad home screen icon (GES logo)
- `ges-logo.png` - Original GES logo image

## How to Use

### Option 1: Using Python (Recommended)

1. Open Terminal and navigate to this folder:
   ```bash
   cd "/Users/noelk/repos/GES PRICE LIST"
   ```

2. Start a simple HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000
   ```

### Option 2: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Using the Application

1. **Enter Company Name**: Type the customer's company name (e.g., "LY Enterprises") and click "Start"

2. **Search Products**: Type product code or description in the search bar (minimum 2 characters)
   - Example searches: "TMR-4W", "bulb", "downlight", "5 years"

3. **View Results**: Results display in the black box with:
   - Company name (top left)
   - "Dealer's Price" label (top right)
   - Product code, description, and price
   - Processing date
   - Disclaimer text

4. **Copy Results**: Click "Copy to Clipboard" to copy the results as plain text

5. **Change Company**: Click "Change Company" to enter a new company name

6. **Clear Search**: Click "Clear" to reset the search

## Product Database

The application includes **204 products** from the CENTRON ENERGY SAVINGS TECHNOLOGY CORP. price list, including:

- Streetlights (TL, TLG, XL series)
- Flood Lights (TT, TTG, XT series)
- Hi-Bay (TD, TDG, XD series)
- Tunnel Lights (TS series)
- Tube lights (ET8 series)
- Bulbs (WECS, TEOS, WMCS series)
- MR16/GU10/E27 Spot & Wide Flood (5th Gen & 3rd Gen)
- Downlights (WX series, aluminum and plastic)
- Adaptors
- Residential lighting (2nd Gen SMD series)
- 1 Year Warranty products

## Technical Notes

- The application requires a web server to run due to browser CORS restrictions
- All product data is stored in `data.json` for easy updates
- Search is case-insensitive and matches partial strings
- Results are formatted for professional communication with customers

## Updating Product Data

To update prices or add new products, edit `data.json` with the following format:

```json
{
  "code": "PRODUCT-CODE",
  "description": "Product description and specifications",
  "dealerPrice": "Price"
}
```

## Support

If you encounter issues:
- Ensure you're running the app through a web server (not opening index.html directly)
- Check the browser console (F12) for error messages
- Verify that all files (index.html, style.css, app.js, data.json) are in the same folder
