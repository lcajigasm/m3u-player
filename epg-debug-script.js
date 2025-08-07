// EPG Debug Script - Copy and paste this into browser console

console.log('🔧 Starting EPG Debug...');

// Test 1: Check if elements exist
console.log('📋 Step 1: Checking DOM elements...');
const epgBtn = document.getElementById('epgBtn');
const epgModal = document.getElementById('epgModal');
const closeBtn = document.getElementById('closeEPG');

console.log('EPG Button:', epgBtn);
console.log('EPG Modal:', epgModal);
console.log('Close Button:', closeBtn);

// Test 2: Check if M3UPlayer instance exists
console.log('📋 Step 2: Checking M3UPlayer instance...');
let player = window.player;
if (!player) {
    // Try to find it in different ways
    player = document.querySelector('script')?.player;
    console.log('Player found via script:', player);
}

console.log('M3UPlayer instance:', player);

// Test 3: Try to show modal manually
console.log('📋 Step 3: Testing modal display manually...');
if (epgModal) {
    epgModal.style.display = 'flex';
    epgModal.classList.add('show');
    console.log('✅ Modal should now be visible');
    
    // Add test content
    const content = epgModal.querySelector('.epg-grid-container');
    if (content) {
        content.innerHTML = `
            <div style="padding: 20px; text-align: center; color: white;">
                <h3>🐛 Debug Test - EPG Modal Working!</h3>
                <p>If you see this, the modal is working correctly.</p>
                <p>Time: ${new Date().toLocaleTimeString()}</p>
                <button onclick="document.getElementById('epgModal').style.display='none'" 
                        style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
                    Close Modal
                </button>
            </div>
        `;
        console.log('✅ Test content added to modal');
    }
} else {
    console.error('❌ EPG Modal not found!');
}

// Test 4: Check if EPG button has event listener
console.log('📋 Step 4: Testing EPG button click...');
if (epgBtn) {
    // Add our own click handler for testing
    epgBtn.addEventListener('click', function() {
        console.log('🎯 EPG Button clicked - Debug handler');
        if (epgModal) {
            epgModal.style.display = 'flex';
            epgModal.classList.add('show');
            console.log('✅ Modal opened via debug handler');
        }
    });
    console.log('✅ Debug click handler added to EPG button');
} else {
    console.error('❌ EPG Button not found!');
}

// Test 5: Check all available buttons
console.log('📋 Step 5: Available buttons with IDs:');
const allButtons = document.querySelectorAll('button[id]');
allButtons.forEach(btn => {
    console.log(`  - ${btn.id}: "${btn.textContent.trim()}" (class: ${btn.className})`);
});

console.log('🎯 EPG Debug completed. Try clicking the EPG button now!');
