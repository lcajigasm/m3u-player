# M3U Player - Source Structure

## 📁 Folder Structure

```
src/
├── index.html          # Main page
├── styles.css          # Main styles
├── js/
│   └── script.js       # Main application logic
├── styles/
│   ├── variables.css   # CSS variables
│   ├── components.css  # Reusable components
│   └── main.css        # Modular main styles
├── assets/
│   ├── icons/          # Application icons
│   └── images/         # Images and logos
├── components/         # Modular JS components (future)
└── utils/              # Utilities and helpers (future)
```

## 🔧 Main Files

### index.html
- Main HTML structure
- Optimized CSS and JS references
- Cache busting with versioning

### styles.css
- Improved global styles
- Responsive design
- CSS variables for themes
- Optimized channel list
- Full-width search

### js/script.js
- Main M3UPlayer class
- Optimized playlist functions
- Better stream type handling
- Simplified item design

## 🎯 Implemented Improvements

1. **Full-width Search**: Removed max-width, full-width enabled
2. **Enhanced Channel List**: 
   - 50x50px logos
   - Only relevant information (name, group, type)
   - Distinctive colored metadata
   - Smooth hover effects
3. **Organized Structure**: Files in logical folders
4. **Optimized CSS**: Cleaner and more efficient styles

## 🚀 Usage

The main file is in the root: `index.html`
Source files are organized in: `src/`

Para desarrollo, trabajar en `src/` y los cambios se reflejan automáticamente.
