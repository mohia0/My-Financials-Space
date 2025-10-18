// Sticky Header Scroll Interactions
let lastScrollY = 0;
let ticking = false;

function updateHeader() {
  const header = document.querySelector('header');
  const scrollY = window.scrollY;
  const isMobile = window.innerWidth <= 768;
  
  if (header) {
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  
  lastScrollY = scrollY;
  ticking = false;
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateHeader);
    ticking = true;
  }
}

// Add scroll event listener
window.addEventListener('scroll', requestTick, { passive: true });

// Add resize event listener to handle mobile/desktop transitions
window.addEventListener('resize', () => {
  // Update header state when screen size changes
  updateHeader();
});

// Initialize header state
document.addEventListener('DOMContentLoaded', () => {
  updateHeader();
});

// Supabase configuration - NEW PROJECT
const SUPABASE_URL = 'https://whurxquryihxeqkwzaly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXJ4cXVyeWloeGVxa3d6YWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjE4ODgsImV4cCI6MjA3NjEzNzg4OH0.SP3SAmaNSTht4oV_rKE8DY7wHmdR7NYjqDjpXV7elDE';

// Initialize Supabase with optimized configuration
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'financial-tool'
    }
  }
});

// Make Supabase available globally
window.supabaseClient = supabase;

// Utility function to slugify file names
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .substring(0, 80);
}

// Profile management functions
async function loadProfile() {
  try {
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
    
    if (sessionError) {
      return { row: null, avatarUrl: null };
    }
    
    if (!session) {
      return { row: null, avatarUrl: null };
    }
    
    const { data: row, error } = await window.supabaseClient
      .from('user_settings')
      .select('full_name, avatars_path')
      .eq('user_id', session.user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return { row: null, avatarUrl: null };
    }
    
    let avatarUrl = null;
    if (row && row.avatars_path) {
      const { data: signedUrl, error: urlError } = await window.supabaseClient.storage
        .from('avatars')
        .createSignedUrl(row.avatars_path, 7 * 24 * 60 * 60); // 7 days
      
      if (!urlError && signedUrl) {
        avatarUrl = signedUrl.signedUrl;
      }
    }
    
    return { row, avatarUrl };
  } catch (error) {
    return { row: null, avatarUrl: null };
  }
}

async function saveProfile({ fullName, file }) {
  try {
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
    
    if (sessionError) {
      throw new Error('Session error: ' + sessionError.message);
    }
    
    if (!session) {
      throw new Error('No active session. Please log in.');
    }
    
    const user = session.user;
    let avatarsPath = null;
    
    // Handle file upload if provided
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PNG, JPEG, WebP, or AVIF images only.');
      }
      
      // Validate file size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Please upload images smaller than 5MB.');
      }
      
      // Generate file path
      const fileExt = file.name.split('.').pop().toLowerCase();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const slugifiedName = slugify(baseName);
      const timestamp = Date.now();
      avatarsPath = `${user.id}/${timestamp}-${slugifiedName}.${fileExt}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
        .from('avatars')
        .upload(avatarsPath, file, {
          upsert: true,
          cacheControl: '3600'
        });
      
      if (uploadError) {
        throw new Error('Upload failed: ' + uploadError.message);
      }
    }
    
    // Prepare data for upsert
    const upsertData = {
      user_id: user.id,
      full_name: fullName
    };
    
    if (avatarsPath) {
      upsertData.avatars_path = avatarsPath;
    }
    
    // Upsert user settings
    const { data: row, error: upsertError } = await window.supabaseClient
      .from('user_settings')
      .upsert(upsertData, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (upsertError) {
      throw new Error('Failed to save profile: ' + upsertError.message);
    }
    
    // Generate signed URL if a new file was uploaded
    let avatarUrl = null;
    if (avatarsPath) {
      const { data: signedUrl, error: urlError } = await window.supabaseClient.storage
        .from('avatars')
        .createSignedUrl(avatarsPath, 7 * 24 * 60 * 60); // 7 days
      
      if (!urlError && signedUrl) {
        avatarUrl = signedUrl.signedUrl;
      }
    }
    
    return { row, avatarUrl };
  } catch (error) {
    throw error;
  }
}

  document.addEventListener('DOMContentLoaded', function(){
    const $ = (s, el)=> (el||document).querySelector(s);
    
    // Page Navigation
    let currentPage = 'expenses';
    let currentYear = new Date().getFullYear().toString(); // Default to current year
    
    // Add resize listener for responsive grid updates
    window.addEventListener('resize', function() {
      updateGridTemplate();
    });
    

    // Initialize page navigation
    function initPageNavigation() {
      const tabExpenses = $('#tabExpenses');
      const tabIncome = $('#tabIncome');
      const tabAnalytics = $('#tabAnalytics');
      const pageExpenses = $('#pageExpenses');
      const pageIncome = $('#pageIncome');
      const pageAnalytics = $('#pageAnalytics');
      
      if (tabExpenses && tabIncome && tabAnalytics && pageExpenses && pageIncome && pageAnalytics) {
        // Set initial state
        showPage('expenses');
        
        // Initialize mobile navigation
        updateMobileNavActiveState('expenses');
        
        // Add mobile navigation click listeners
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = btn.getAttribute('data-page');
            showPage(page);
          });
        });
        
        // Add click listeners
        tabExpenses.addEventListener('click', () => showPage('expenses'));
        tabIncome.addEventListener('click', () => showPage('income'));
        tabAnalytics.addEventListener('click', () => showPage('analytics'));
      }
    }
    
    function showPage(page) {
      const tabExpenses = $('#tabExpenses');
      const tabIncome = $('#tabIncome');
      const tabAnalytics = $('#tabAnalytics');
      const pageExpenses = $('#pageExpenses');
      const pageIncome = $('#pageIncome');
      const pageAnalytics = $('#pageAnalytics');
      const yearTabsContainer = $('#yearTabsContainer');
      
      if (page === 'expenses') {
        tabExpenses?.classList.add('active');
        tabIncome?.classList.remove('active');
        tabAnalytics?.classList.remove('active');
        pageExpenses?.style.setProperty('display', 'block');
        pageIncome?.style.setProperty('display', 'none');
        pageAnalytics?.style.setProperty('display', 'none');
        yearTabsContainer?.style.setProperty('display', 'none');
        currentPage = 'expenses';
      } else if (page === 'income') {
        tabExpenses?.classList.remove('active');
        tabIncome?.classList.add('active');
        tabAnalytics?.classList.remove('active');
        pageExpenses?.style.setProperty('display', 'none');
        pageIncome?.style.setProperty('display', 'block');
        pageAnalytics?.style.setProperty('display', 'none');
        yearTabsContainer?.style.setProperty('display', 'flex');
        currentPage = 'income';
        
        // Ensure current year is selected when switching to income page
        ensureCurrentYearSelected();
        
        // Apply lock state to income page elements
        updateInputsLockState();
        
        // Update income KPIs live when switching to income page
        updateIncomeKPIsLive();
      } else if (page === 'analytics') {
        tabExpenses?.classList.remove('active');
        tabIncome?.classList.remove('active');
        tabAnalytics?.classList.add('active');
        pageExpenses?.style.setProperty('display', 'none');
        pageIncome?.style.setProperty('display', 'none');
        pageAnalytics?.style.setProperty('display', 'block');
        yearTabsContainer?.style.setProperty('display', 'none');
        currentPage = 'analytics';
        
        // Update analytics page data
        updateAnalyticsPage();
      }
      
      // Update mobile navigation active state
      updateMobileNavActiveState(page);
    }
    
    // Update mobile navigation active state
    function updateMobileNavActiveState(page) {
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.querySelector(`.mobile-nav-btn[data-page="${page}"]`);
      if (activeBtn) {
        activeBtn.classList.add('active');
      }
    }
    
    // Mobile navigation function (called from HTML onclick)
    function switchPage(page) {
      showPage(page);
    }
    
    // Ensure current year is selected
    function ensureCurrentYearSelected() {
      const currentYearString = new Date().getFullYear().toString();
      const currentYearTab = document.querySelector(`[data-year="${currentYearString}"]`);
      
      if (currentYearTab) {
        // Remove active class from all tabs first
        document.querySelectorAll('.year-tab').forEach(tab => tab.classList.remove('active'));
        // Set current year as active
        currentYearTab.classList.add('active');
        currentYear = currentYearString;
        
        // Update income data for the current year
        updateIncomeForYear(currentYear);
      } else {
        // If current year tab doesn't exist, create it and set as active
        createYearTab(currentYearString);
        switchYear(currentYearString);
      }
    }
    
    // Year Tab Navigation
    function initYearTabs() {
      const yearTabs = document.querySelectorAll('.year-tab');
      const manageYearsBtn = $('#manageYearsBtn');
      
      yearTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const year = tab.getAttribute('data-year');
          switchYear(year);
        });
      });
      
      if (manageYearsBtn) {
        manageYearsBtn.addEventListener('click', showYearManagementPanel);
      }
      
      // Set current year as active by default
      const currentYearString = new Date().getFullYear().toString();
      const currentYearTab = document.querySelector(`[data-year="${currentYearString}"]`);
      if (currentYearTab) {
        // Remove active class from all tabs first
        yearTabs.forEach(tab => tab.classList.remove('active'));
        // Set current year as active
        currentYearTab.classList.add('active');
        currentYear = currentYearString;

      } else {
        // If current year tab doesn't exist, use the first available tab
        if (yearTabs.length > 0) {
          yearTabs[0].classList.add('active');
          currentYear = yearTabs[0].getAttribute('data-year');

        }
      }
    }
    
    function switchYear(year) {

      
      // Remove active class from all year tabs
      document.querySelectorAll('.year-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Add active class to selected year tab
      const selectedTab = document.querySelector(`[data-year="${year}"]`);
      if (selectedTab) {
        selectedTab.classList.add('active');
        currentYear = year;

        
        // Update income data for selected year
        if (currentPage === 'income') {
          updateIncomeForYear(year);
        }
        
        // Trigger live KPI updates when year changes
        updateIncomeKPIsLive();
      }
    }
    
    
    function removeYear(year) {
      showYearConfirmDialog(year);
    }
    
    function showYearConfirmDialog(year) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'year-confirm-overlay';
      
      // Create dialog
      const dialog = document.createElement('div');
      dialog.className = 'year-confirm-dialog';
      dialog.innerHTML = `
        <div class="year-confirm-message">Remove year ${year}?</div>
        <div class="year-confirm-buttons">
          <button class="year-confirm-btn year-confirm-yes" onclick="confirmRemoveYear(${year})">Sure!</button>
          <button class="year-confirm-btn year-confirm-no" onclick="closeYearConfirmDialog()">Cancel</button>
        </div>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeYearConfirmDialog();
        }
      });
    }
    
    async function confirmRemoveYear(year) {
      // Remove from state
      delete state.income[year];
      
      // Remove from DOM
      const yearTab = document.querySelector(`[data-year="${year}"]`);
      if (yearTab) {
        yearTab.remove();
      }
      
      // Switch to current year if we removed the active year
      if (currentYear === year.toString()) {
        const remainingTabs = document.querySelectorAll('.year-tab');
        if (remainingTabs.length > 0) {
          const firstTab = remainingTabs[0];
          switchYear(firstTab.getAttribute('data-year'));
        }
      }
      
      // Delete all income records for this year from Supabase
      if (supabaseReady && currentUser) {
        try {
          const { error } = await window.supabaseClient
            .from('income')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('year', parseInt(year));
          
          if (error) throw error;

        } catch (error) {

        }
      }
      
      // Refresh year management panel
      refreshYearManagementPanel();
      
      // Save changes locally and to Supabase
      save();
      
      // Close dialog
      closeYearConfirmDialog();
      

    }
    
    function closeYearConfirmDialog() {
      const overlay = document.querySelector('.year-confirm-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
    
    function showYearManagementPanel() {
      const manageBtn = $('#manageYearsBtn');
      if (!manageBtn) return;
      
      // Remove existing panel if any
      const existingPanel = document.querySelector('.year-management-panel');
      if (existingPanel) {
        existingPanel.remove();
      }
      
      // Create year management panel
      const panel = document.createElement('div');
      panel.className = 'year-management-panel show';
      
      // Get all existing years and sort them (smallest to largest for display)
      const existingYears = Array.from(document.querySelectorAll('.year-tab'))
        .map(tab => parseInt(tab.getAttribute('data-year')))
        .sort((a, b) => a - b);
      
      // Get min and max years for add buttons
      const minYear = Math.min(...existingYears);
      const maxYear = Math.max(...existingYears);
      
      // Create year list with separators
      let yearListHTML = '';
      for (let i = 0; i < existingYears.length; i++) {
        const year = existingYears[i];
        const isActive = currentYear === year.toString();
        
        // Add year item
        yearListHTML += `
          <div class="year-item ${isActive ? 'active' : ''}">
            <span>${year}</span>
            <div class="year-item-controls">
              <button class="year-btn year-btn-remove" onclick="removeYear(${year})" title="Remove ${year}">-</button>
            </div>
          </div>
        `;
        
        // Add separator between years only if there's a missing year
        if (i < existingYears.length - 1) {
          const nextYear = existingYears[i + 1];
          const middleYear = year + 1;
          const canAddBetween = middleYear < nextYear && !existingYears.includes(middleYear);
          
          // Only show separator if there's actually a missing year
          if (canAddBetween) {
            yearListHTML += `
              <div class="year-separator">
                <div class="year-separator-line"></div>
                <button class="year-add-between" 
                        onclick="addYearBetween(${year}, ${nextYear})" 
                        title="Add ${middleYear}">+</button>
                <div class="year-separator-line"></div>
              </div>
            `;
          }
        }
      }
      
      panel.innerHTML = `
        <div class="year-management-header">Manage Years</div>
        
        <div class="year-add-buttons">
          <button class="year-add-btn" onclick="addYearBefore(${minYear})" title="Add year before ${minYear}">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add before ${minYear}
          </button>
        </div>
        
        <div class="year-list">
          ${yearListHTML}
        </div>
        
        <div class="year-add-buttons">
          <button class="year-add-btn" onclick="addYearAfter(${maxYear})" title="Add year after ${maxYear}">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add after ${maxYear}
          </button>
        </div>
      `;
      
      // Position panel
      manageBtn.style.position = 'relative';
      manageBtn.appendChild(panel);
      
      // Close panel when clicking outside
      setTimeout(() => {
        document.addEventListener('click', function closePanel(e) {
          if (!panel.contains(e.target) && e.target !== manageBtn) {
            panel.remove();
            document.removeEventListener('click', closePanel);
          }
        });
      }, 100);
    }
    
    function refreshYearManagementPanel() {
      const panel = document.querySelector('.year-management-panel');
      if (panel) {
        showYearManagementPanel();
      }
    }
    
    function addYearBefore(year) {
      const newYear = year - 1;
      if (newYear < 1900) {
        alert('Cannot add years before 1900');
        return;
      }
      
      // Check if year already exists
      const existingYearTab = document.querySelector(`[data-year="${newYear}"]`);
      if (existingYearTab) {
        alert(`Year ${newYear} already exists!`);
        return;
      }
      
      addYearToTabs(newYear);
      refreshYearManagementPanel();

    }
    
    function addYearAfter(year) {
      const newYear = year + 1;
      if (newYear > 2100) {
        alert('Cannot add years after 2100');
        return;
      }
      
      // Check if year already exists
      const existingYearTab = document.querySelector(`[data-year="${newYear}"]`);
      if (existingYearTab) {
        alert(`Year ${newYear} already exists!`);
        return;
      }
      
      addYearToTabs(newYear);
      refreshYearManagementPanel();

    }
    
    function addYearBetween(year1, year2) {
      const newYear = year1 + 1;
      if (newYear >= year2) {
        alert('No year available between these years');
        return;
      }
      
      // Check if year already exists
      const existingYearTab = document.querySelector(`[data-year="${newYear}"]`);
      if (existingYearTab) {
        alert(`Year ${newYear} already exists!`);
        return;
      }
      
      addYearToTabs(newYear);
      refreshYearManagementPanel();

    }
    
    function createYearTabsFromData(incomeData) {
      const yearTabsContainer = $('#yearTabsContainer');
      if (!yearTabsContainer) return;
      
      // Clear existing year tabs (except the manage button)
      const existingTabs = yearTabsContainer.querySelectorAll('.year-tab');
      existingTabs.forEach(tab => tab.remove());
      
      // Get years from data
      const dataYears = Object.keys(incomeData).map(year => parseInt(year));
      
      let years = [];
      
      // Only add default years if there are NO years at all
      if (dataYears.length === 0) {
        const currentYearNum = new Date().getFullYear();
        years = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

      } else {
        // Use only the years that have data
        years = dataYears;

      }
      
      // Sort years chronologically
      years.sort((a, b) => a - b);
      
      // Create year tabs for all years
      years.forEach(year => {
        const yearTab = document.createElement('button');
        yearTab.className = 'year-tab';
        yearTab.setAttribute('data-year', year);
        yearTab.textContent = year;
        yearTab.addEventListener('click', () => switchYear(year.toString()));
        
        // Insert before manage button
        const manageBtn = $('#manageYearsBtn');
        yearTabsContainer.insertBefore(yearTab, manageBtn);
      });
      
      // Set current year as active if no current year is set
      if (!currentYear && years.length > 0) {
        const currentYearNum = new Date().getFullYear();
        if (years.includes(currentYearNum)) {
          switchYear(currentYearNum.toString());
        } else {
        switchYear(years[0].toString());
        }
      }
      

      
      // Save years to Supabase to ensure they're persisted

        save(); // This will update available_years in user_settings
    }
    
    function addYearToTabs(newYear) {
      const yearTabsContainer = $('#yearTabsContainer');
      if (!yearTabsContainer) return;
      
      // Initialize the year in the income data structure
      if (!state.income[newYear]) {
        state.income[newYear] = [];
      }
      
      // Create new year tab
      const newYearTab = document.createElement('button');
      newYearTab.className = 'year-tab';
      newYearTab.setAttribute('data-year', newYear);
      newYearTab.textContent = newYear;
      newYearTab.addEventListener('click', () => switchYear(newYear.toString()));
      
      // Insert in chronological order (smallest to largest)
      const existingTabs = Array.from(yearTabsContainer.querySelectorAll('.year-tab'));
      const manageBtn = $('#manageYearsBtn');
      
      // Find the right position to insert (maintain chronological order)
      let insertBefore = manageBtn;
      for (const tab of existingTabs) {
        const tabYear = parseInt(tab.getAttribute('data-year'));
        if (newYear < tabYear) {
          insertBefore = tab;
          break;
        }
      }
      
      yearTabsContainer.insertBefore(newYearTab, insertBefore);
      
      // Save changes locally and to Supabase
      save();
      

    }
    
    function updateIncomeForYear(year) {
      // Ensure the year exists in the income data structure
      if (!state.income[year]) {
        state.income[year] = [];
      }
      
      // Re-render the income list with year-specific data
      renderIncomeList('list-income', state.income[year]);
      
      // Update KPIs for the selected year
      renderKPIs();
    }
    
    // Initialize navigation
    initPageNavigation();
    initYearTabs();
    
    // Note: currentYear is now set in initYearTabs() to default to current year
    
    // Initialize order properties for existing rows that don't have them
    function initializeRowOrder() {
      // Initialize personal expenses order
      if (state.personal) {
        state.personal.forEach((row, index) => {
          if (row.order === undefined) {
            row.order = index;
          }
        });
      }
      
      // Initialize business expenses order
      if (state.biz) {
        state.biz.forEach((row, index) => {
          if (row.order === undefined) {
            row.order = index;
          }
        });
      }
      
      // Initialize income order for all years
      if (state.income) {
        Object.keys(state.income).forEach(year => {
          if (state.income[year]) {
            state.income[year].forEach((row, index) => {
              if (row.order === undefined) {
                row.order = index;
              }
            });
          }
        });
      }
    }

    // Add row function
    function addRow(group){

      
      // Check if inputs are locked
      if (state.inputsLocked) {
        showNotification('Cannot add rows while inputs are locked', 'warning', 3000);
        return;
      }
      
      if(group==='biz') {
        const newRow = {name:'', cost:0, status:'Active', billing:'Monthly', next:''};
        // Initialize financial values
        newRow.monthlyUSD = 0;
        newRow.yearlyUSD = 0;
        newRow.monthlyEGP = 0;
        newRow.yearlyEGP = 0;
        // Set order to be at the end
        newRow.order = state.biz.length;
        state.biz.push(newRow);

      }
      else if(group==='income') {
        // Ensure we have the correct current year from the active tab
        const activeYearTab = document.querySelector('.year-tab.active');
        if (activeYearTab) {
          currentYear = activeYearTab.getAttribute('data-year');
        }
        
        // Fallback to current year if no tab is active
        if (!currentYear) {
          currentYear = new Date().getFullYear().toString();

        }
        

        
        // Ensure the current year exists in the income data structure
        if (!state.income[currentYear]) {
          state.income[currentYear] = [];

        }
        
        // Set default date with current year
        const today = new Date();
        const year = parseInt(currentYear) || today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        
        const newIncome = {
          name:'', 
          tags:'', 
          date: defaultDate, 
          allPayment:0, 
          paidUsd:0, 
          method:'Bank Transfer',
          icon: 'fa:dollar-sign'
        };
        
        // Set order to be at the end
        newIncome.order = state.income[currentYear].length;
        state.income[currentYear].push(newIncome);

        
        // Instantly save the new income row to Supabase
        setTimeout(() => {
          instantSaveIncomeRow(newIncome, currentYear);
        }, 100); // Small delay to ensure the row is properly added to state
      }
      else if(group==='personal') {
        const newRow = {name:'', cost:0, status:'Active', billing:'Monthly'};
        // Initialize financial values
        newRow.monthlyUSD = 0;
        newRow.yearlyUSD = 0;
        newRow.monthlyEGP = 0;
        newRow.yearlyEGP = 0;
        // Set order to be at the end
        newRow.order = state.personal.length;
        state.personal.push(newRow);

      }
      
      // Save and re-render
      save('add-row'); 
      clearCalculationCache(); // Clear cache when data changes
      renderAll();
    }
    
    // Make functions globally accessible
    window.addRow = addRow;
    window.removeYear = removeYear;
    window.addYearBefore = addYearBefore;
    window.saveImportedIncomeSequentially = saveImportedIncomeSequentially;
    window.saveAllRowsWithoutIds = saveAllRowsWithoutIds;
    window.applySmartSVGInversion = applySmartSVGInversion;
    
    // Function to force clear all IDs from income data
    window.clearAllIncomeIds = function() {
      let clearedCount = 0;
      
      Object.keys(state.income || {}).forEach(year => {
        const yearData = state.income[year] || [];
        yearData.forEach((row, index) => {
          if (row.id) {
            delete row.id;
            clearedCount++;
          }
        });
      });
      
      saveToLocal();
      showNotification(`Cleared ${clearedCount} IDs from income data`, 'info', 2000);
      return clearedCount;
    };
    window.addYearAfter = addYearAfter;
    window.addYearBetween = addYearBetween;
    window.confirmRemoveYear = confirmRemoveYear;
    window.closeYearConfirmDialog = closeYearConfirmDialog;
    
    // Supabase integration
    let currentUser = null;
    let supabaseReady = false;
    
    // Wait for Supabase to be ready
    const checkSupabase = setInterval(() => {
      if (window.supabaseClient) {
        supabaseReady = true;
        clearInterval(checkSupabase);




        initializeAuth();
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!supabaseReady) {

        showNotification('Supabase connection failed. Using local storage only.', 'error');
        loadLocalData();
      }
    }, 10000);
    
    // Test Supabase connection
    async function testSupabaseConnection() {
      try {

        const { data, error } = await window.supabaseClient
          .from('user_settings')
          .select('count')
          .limit(1);
        
        if (error) {

          showNotification(`Database connection error: ${error.message}`, 'error');
        } else {

        }
      } catch (error) {

        showNotification(`Connection test failed: ${error.message}`, 'error');
      }
    }
    
    function initializeAuth() {
      
      // Test Supabase connection
      testSupabaseConnection();
      
      // Check if user came from password reset link
      checkPasswordResetToken();
      
      // Set up Supabase authentication state listener
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          currentUser = session.user;
          updateAuthUI();
          updateUserDisplay();
          loadUserData();
          
          // Initialize basic sync system for cloud saves
          console.log('✅ User signed in, cloud sync enabled');
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          updateAuthUI();
          
          // User signed out
          console.log('👋 User signed out, cloud sync disabled');
          
          // Clear all data when signed out
          state.personal = [];
          state.biz = [];
          state.income = {
            2022: [],
            2023: [],
            2024: [],
            2025: []
          };
          state.fx = 48.1843;
          state.theme = 'dark';
          state.autosave = 'on';
          state.includeAnnualInMonthly = false;
          columnOrder = ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'];
          
          // Clear local storage
          localStorage.removeItem('finance-notion-v6');
          localStorage.removeItem('columnOrder');
          
          // Render empty tables
          renderAll();
        } else {
          // No session (not signed in) - load local data if available
          currentUser = null;
          updateAuthUI();

          loadLocalData();
        }
      });
      
      // Set up authentication event listeners
      const loginBtn = $('#btnLogin');
      const signInBtn = $('#btnSignIn');
      const logoutBtn = $('#btnLogout');
      const userMenuBtn = $('#userMenuBtn');
      const accountMenuBtn = $('#accountMenuBtn');
      
      if (loginBtn) {
        loginBtn.addEventListener('click', openAuthModal);

      }
      
      if (signInBtn) {
        signInBtn.addEventListener('click', openAuthModal);

      }
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);

      }
      
      if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserDropdown);

      }
      
      if (accountMenuBtn) {
        accountMenuBtn.addEventListener('click', toggleAccountDropdown);

      }
      
      // Modal event listeners
      const emailSignInBtn = $('#emailSignInBtn');
      const emailSignUpBtn = $('#emailSignUpBtn');
      const forgotPasswordBtn = $('#forgotPasswordBtn');
      const sendResetBtn = $('#sendResetBtn');
      const backToSignInBtn = $('#backToSignInBtn');
      
      if (emailSignInBtn) {
        emailSignInBtn.addEventListener('click', signInWithEmail);

      }
      
      if (emailSignUpBtn) {
        emailSignUpBtn.addEventListener('click', signUpWithEmail);

      }
      
      if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', showForgotPasswordForm);

      }
      
      if (sendResetBtn) {
        sendResetBtn.addEventListener('click', sendPasswordReset);

      }
      
      if (backToSignInBtn) {
        backToSignInBtn.addEventListener('click', showSignInForm);

      }
      
      const updatePasswordBtn = $('#updatePasswordBtn');
      const cancelResetBtn = $('#cancelResetBtn');
      const changePasswordBtn = $('#changePasswordBtn');
      const savePasswordBtn = $('#savePasswordBtn');
      const cancelChangeBtn = $('#cancelChangeBtn');
      
      if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', updatePassword);

      }
      
      if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', showSignInForm);

      }
      
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
          closeUserDropdown();
          openAuthModal();
          showChangePasswordForm();
        });

      }
      
      // Account button event listener
      const accountBtn = $('#accountBtn');
      if (accountBtn) {
        accountBtn.addEventListener('click', () => {
          closeUserDropdown();
          openAuthModal();
          showAccountForm();
        });

      }
      
      
      if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', changePassword);

      }
      
      if (cancelChangeBtn) {
        cancelChangeBtn.addEventListener('click', closeAuthModal);

      }
      
      // Account form event listeners
      const saveAccountBtn = $('#saveAccountBtn');
      const cancelAccountBtn = $('#cancelAccountBtn');
      const uploadProfilePicBtn = $('#uploadProfilePicBtn');
      const accountProfilePic = $('#accountProfilePic');
      
      if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', saveAccountData);

      }
      
      if (cancelAccountBtn) {
        cancelAccountBtn.addEventListener('click', closeAuthModal);

      }
      
      if (uploadProfilePicBtn) {
        uploadProfilePicBtn.addEventListener('click', () => {
          accountProfilePic.click();
        });

      }
      
      if (accountProfilePic) {
        accountProfilePic.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const preview = $('#profilePicPreview');
              preview.innerHTML = `<img src="${e.target.result}" alt="Profile Picture">`;
            };
            reader.readAsDataURL(file);
          }
        });

      }
      
      
      // Close modal when clicking overlay
      const authModal = $('#authModal');
      if (authModal) {
        authModal.addEventListener('click', (e) => {
          if (e.target === authModal || e.target.classList.contains('auth-modal-overlay')) {
            closeAuthModal();
          }
        });
      }
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const userInfo = $('#userInfo');
        const userDropdown = $('#userDropdown');
        const accountDropdown = $('#accountDropdown');
        const accountMenuBtn = $('#accountMenuBtn');
        
        if (userInfo && userDropdown && !userInfo.contains(e.target)) {
          closeUserDropdown();
        }
        
        if (accountDropdown && accountMenuBtn && !accountMenuBtn.contains(e.target) && !accountDropdown.contains(e.target)) {
          closeAccountDropdown();
        }
      });
      
      // Handle Enter key in email form
      const authEmail = $('#authEmail');
      const authPassword = $('#authPassword');
      
      if (authEmail) {
        authEmail.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            signInWithEmail();
          }
        });
      }
      
      if (authPassword) {
        authPassword.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            signInWithEmail();
          }
        });
      }
      
      // Show login button immediately
      updateAuthUI();
      
      // Test Supabase connection
      testSupabaseConnection();
    }
    
    async function testSupabaseConnection() {
      try {

        // Try to get current user
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        
        // Test database connection
        const { data, error } = await window.supabaseClient.from('backups').select('count').limit(1);
        
        

      } catch (error) {

      }
    }
    
    function updateAuthUI() {
      const loginBtn = $('#btnLogin');
      const signInBtn = $('#btnSignIn');
      const userInfo = $('#userInfo');
      const userName = $('#userName');
      const userEmail = $('#userEmail');
      const userPhoto = $('#userPhoto');
      const dropdownUserName = $('#dropdownUserName');
      const dropdownUserEmail = $('#dropdownUserEmail');
      const dropdownUserPhoto = $('#dropdownUserPhoto');
      const accountMenuBtn = $('#accountMenuBtn');
      
      if (currentUser) {
        loginBtn.style.display = 'none';
        if (signInBtn) {
          signInBtn.style.display = 'none';
          signInBtn.style.setProperty('display', 'none', 'important');
        }
        if (accountMenuBtn) accountMenuBtn.style.display = 'flex';
        userInfo.style.display = 'block';
        
        // Handle Supabase user object
        const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User';
        const email = currentUser.email || '';
        const photoURL = currentUser.user_metadata?.avatar_url;
        
        // Update main user info
        userName.textContent = displayName;
        userEmail.textContent = email;
        
        // Update dropdown user info
        if (dropdownUserName) dropdownUserName.textContent = displayName;
        if (dropdownUserEmail) dropdownUserEmail.textContent = email;
        
        // Handle profile photos
        if (photoURL) {
          userPhoto.src = photoURL;
          userPhoto.style.display = 'block';
        } else {
          userPhoto.style.display = 'none';
        }
        

      } else {
        loginBtn.style.display = 'flex';
        if (signInBtn) {
          signInBtn.style.display = 'flex';
          signInBtn.style.setProperty('display', 'flex', 'important');
        }
        if (accountMenuBtn) accountMenuBtn.style.display = 'none';
        userInfo.style.display = 'none';

      }
    }
    
    // User Dropdown Functions
    function toggleUserDropdown() {
      const dropdown = $('#userDropdown');
      if (dropdown) {
        const isVisible = dropdown.classList.contains('show');
        if (isVisible) {
          closeUserDropdown();
        } else {
          openUserDropdown();
        }
      }
    }
    
    function openUserDropdown() {
      const dropdown = $('#userDropdown');
      if (dropdown) {
        dropdown.style.display = 'block';
        // Small delay for smooth animation
        setTimeout(() => {
          dropdown.classList.add('show');
        }, 10);
      }
    }
    
    function closeUserDropdown() {
      const dropdown = $('#userDropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
        // Hide after animation completes
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 200);
      }
    }
    
    // Account Dropdown Functions
    function toggleAccountDropdown() {
      const dropdown = $('#accountDropdown');
      if (dropdown) {
        const isVisible = dropdown.classList.contains('show');
        if (isVisible) {
          closeAccountDropdown();
        } else {
          openAccountDropdown();
        }
      }
    }
    
    function openAccountDropdown() {
      const dropdown = $('#accountDropdown');
      if (dropdown) {
        dropdown.style.display = 'block';
        // Small delay for smooth animation
        setTimeout(() => {
          dropdown.classList.add('show');
        }, 10);
      }
    }
    
    function closeAccountDropdown() {
      const dropdown = $('#accountDropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
        // Hide after animation completes
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 200);
      }
    }
    
    // Modal Functions
    function openAuthModal() {
      const modal = $('#authModal');
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Ensure sign-in form is shown by default
        showSignInForm();
        

      }
    }
    
    function closeAuthModal() {
      const modal = $('#authModal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        clearAuthStatus();
      }
    }
    
    // Make functions globally available
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    
    function showAuthStatus(message, type = 'success') {
      const status = $('#authStatus');
      if (status) {
        status.textContent = message;
        status.className = `auth-status ${type}`;
        status.style.display = 'block';
      }
    }
    
    function clearAuthStatus() {
      const status = $('#authStatus');
      if (status) {
        status.style.display = 'none';
      }
    }
    
    function showAuthLoading(show = true) {
      const loading = $('#authLoading');
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      
      if (loading) loading.style.display = show ? 'flex' : 'none';
      
      // Only hide the currently visible form when loading
      if (show) {
        if (emailForm && emailForm.style.display === 'flex') emailForm.style.display = 'none';
        if (forgotForm && forgotForm.style.display === 'flex') forgotForm.style.display = 'none';
        if (resetForm && resetForm.style.display === 'flex') resetForm.style.display = 'none';
      } else {
        // When loading stops, show the appropriate form
        if (emailForm && emailForm.style.display !== 'none') emailForm.style.display = 'flex';
      }
    }
    
    function showForgotPasswordForm() {
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      const changeForm = $('#changePasswordForm');
      const accountForm = $('#accountForm');
      
      // Hide all forms first
      if (emailForm) {
        emailForm.style.display = 'none';
        emailForm.classList.add('hidden');
      }
      if (forgotForm) {
        forgotForm.style.display = 'none';
        forgotForm.classList.add('hidden');
      }
      if (resetForm) {
        resetForm.style.display = 'none';
        resetForm.classList.add('hidden');
      }
      if (changeForm) {
        changeForm.style.display = 'none';
        changeForm.classList.add('hidden');
      }
      if (accountForm) {
        accountForm.style.display = 'none';
        accountForm.classList.add('hidden');
      }
      
      // Show forgot password form
      if (forgotForm) {
        forgotForm.style.display = 'flex';
        // Remove hidden class immediately to enable pointer events
        forgotForm.classList.remove('hidden');
      }
      
      // Update header for forgot password
      updateAuthModalHeader('Reset Your Password', 'Enter your email to receive a reset link');
      
      // Ensure auth inputs are always enabled
      enableAuthModalInputs();
      
      clearAuthStatus();
    }
    
    function showSignInForm() {
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      const changeForm = $('#changePasswordForm');
      const accountForm = $('#accountForm');
      
      // Hide all forms first
      if (emailForm) {
        emailForm.style.display = 'none';
        emailForm.classList.add('hidden');
      }
      if (forgotForm) {
        forgotForm.style.display = 'none';
        forgotForm.classList.add('hidden');
      }
      if (resetForm) {
        resetForm.style.display = 'none';
        resetForm.classList.add('hidden');
      }
      if (changeForm) {
        changeForm.style.display = 'none';
        changeForm.classList.add('hidden');
      }
      if (accountForm) {
        accountForm.style.display = 'none';
        accountForm.classList.add('hidden');
      }
      
      // Show sign-in form
      if (emailForm) {
        emailForm.style.display = 'flex';
        // Remove hidden class immediately to enable pointer events
        emailForm.classList.remove('hidden');
      }
      
      // Update header for sign-in
      updateAuthModalHeader('Welcome to Financial Tool', 'Sign in to sync your data across devices');
      
      // Ensure auth inputs are always enabled
      enableAuthModalInputs();
      
      clearAuthStatus();
    }
    
    function showPasswordResetForm() {
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      const changeForm = $('#changePasswordForm');
      const accountForm = $('#accountForm');
      
      // Hide all forms first
      if (emailForm) {
        emailForm.style.display = 'none';
        emailForm.classList.add('hidden');
      }
      if (forgotForm) {
        forgotForm.style.display = 'none';
        forgotForm.classList.add('hidden');
      }
      if (resetForm) {
        resetForm.style.display = 'none';
        resetForm.classList.add('hidden');
      }
      if (changeForm) {
        changeForm.style.display = 'none';
        changeForm.classList.add('hidden');
      }
      if (accountForm) {
        accountForm.style.display = 'none';
        accountForm.classList.add('hidden');
      }
      
      // Show password reset form
      if (resetForm) {
        resetForm.style.display = 'flex';
        // Remove hidden class immediately to enable pointer events
        resetForm.classList.remove('hidden');
      }
      
      // Update header for password reset
      updateAuthModalHeader('Set New Password', 'You don\'t need to enter your current password. Just create a new one below.');
      
      // Ensure auth inputs are always enabled
      enableAuthModalInputs();
      
      clearAuthStatus();
    }
    
    function showChangePasswordForm() {
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      const changeForm = $('#changePasswordForm');
      const accountForm = $('#accountForm');
      
      // Hide all forms first
      if (emailForm) {
        emailForm.style.display = 'none';
        emailForm.classList.add('hidden');
      }
      if (forgotForm) {
        forgotForm.style.display = 'none';
        forgotForm.classList.add('hidden');
      }
      if (resetForm) {
        resetForm.style.display = 'none';
        resetForm.classList.add('hidden');
      }
      if (changeForm) {
        changeForm.style.display = 'none';
        changeForm.classList.add('hidden');
      }
      if (accountForm) {
        accountForm.style.display = 'none';
        accountForm.classList.add('hidden');
      }
      
      // Show change password form
      if (changeForm) {
        changeForm.style.display = 'flex';
        // Remove hidden class immediately to enable pointer events
        changeForm.classList.remove('hidden');
      }
      
      // Update header for change password
      updateAuthModalHeader('Change Your Password', 'Create a new password for your account');
      
      // Ensure auth inputs are always enabled
      enableAuthModalInputs();
      
      clearAuthStatus();
    }
    
    function showAccountForm() {
      const emailForm = $('#emailAuthForm');
      const forgotForm = $('#forgotPasswordForm');
      const resetForm = $('#passwordResetForm');
      const changeForm = $('#changePasswordForm');
      const accountForm = $('#accountForm');
      
      // Hide all forms first
      if (emailForm) {
        emailForm.style.display = 'none';
        emailForm.classList.add('hidden');
      }
      if (forgotForm) {
        forgotForm.style.display = 'none';
        forgotForm.classList.add('hidden');
      }
      if (resetForm) {
        resetForm.style.display = 'none';
        resetForm.classList.add('hidden');
      }
      if (changeForm) {
        changeForm.style.display = 'none';
        changeForm.classList.add('hidden');
      }
      if (accountForm) {
        accountForm.style.display = 'none';
        accountForm.classList.add('hidden');
      }
      
      // Show account form
      if (accountForm) {
        accountForm.style.display = 'flex';
        // Remove hidden class immediately to enable pointer events
        accountForm.classList.remove('hidden');
      }
      
      // Update header for account management
      updateAuthModalHeader('Account Settings', 'Manage your profile information');
      
      // Ensure auth inputs are always enabled
      enableAuthModalInputs();
      
      // Load current user data
      loadAccountData();
      
      
      clearAuthStatus();
    }
    
    function checkPasswordResetToken() {
      // Check URL parameters for password reset tokens
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const type = urlParams.get('type');
      

      
      // If this is a password recovery flow
      if (type === 'recovery' && accessToken && refreshToken) {

        
        // Set the session with the tokens
        window.supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(({ data, error }) => {
          if (error) {

            showAuthStatus('Invalid or expired reset link. Please request a new one.', 'error');
            return;
          }
          
          if (data.session) {
            // User is now authenticated, show password reset form (NO current password needed)
            openAuthModal();
            showPasswordResetForm();
            showAuthStatus('Password reset link verified! Please enter your NEW password below.', 'success');

          }
        });
        
        // Clean up URL parameters
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
    
    // Function to update auth modal header dynamically
    function updateAuthModalHeader(title, subtitle) {
      const titleEl = $('#authModalTitle');
      const subtitleEl = $('#authModalSubtitle');
      
      if (titleEl) titleEl.textContent = title;
      if (subtitleEl) subtitleEl.textContent = subtitle;
    }
    
    // Function to ensure auth modal inputs are always enabled
    function enableAuthModalInputs() {
      const authModal = document.getElementById('authModal');
      if (authModal) {
        const authInputs = authModal.querySelectorAll('input, select, textarea, button');
        authInputs.forEach(input => {
          input.disabled = false;
          input.style.pointerEvents = 'auto';
          input.style.userSelect = 'auto';
        });
      }
    }
    
    // Function to load current user account data
    async function loadAccountData() {
      if (currentUser) {
        try {
        // Load user email (readonly)
        $('#accountEmail').value = currentUser.email || '';
        
          // Load profile data from user_settings table
          const { row, avatarUrl } = await loadProfile();
          
          if (row) {
            // Load user name from user_settings
            $('#accountName').value = row.full_name || '';
            
            // Load profile picture from signed URL
            if (avatarUrl) {
              const preview = $('#profilePicPreview');
              preview.innerHTML = `<img src="${avatarUrl}" alt="Profile Picture">`;
          } else {
              // Show placeholder if no avatar
              const preview = $('#profilePicPreview');
              preview.innerHTML = `
                <div class="profile-pic-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              `;
            }
          } else {
            // Fallback to user metadata if no user_settings row
            const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
            $('#accountName').value = name;
            
            // Load profile picture from metadata as fallback
        const profilePic = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.profile_pic || '';
        if (profilePic) {
          const preview = $('#profilePicPreview');
          preview.innerHTML = `<img src="${profilePic}" alt="Profile Picture">`;
            } else {
              // Show placeholder if no avatar
              const preview = $('#profilePicPreview');
              preview.innerHTML = `
                <div class="profile-pic-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              `;
            }
          }
        } catch (error) {

          // Fallback to basic data loading
          const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
          $('#accountName').value = name;
          $('#accountEmail').value = currentUser.email || '';
        }
      }
    }
    
    // Function to save account data
    async function saveAccountData() {
      const name = $('#accountName').value;
      const profilePicFile = $('#accountProfilePic').files[0];
      
      if (!name.trim()) {
        showAuthStatus('Please enter your full name', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        // Use the new saveProfile function
        const { row, avatarUrl } = await saveProfile({
          fullName: name,
          file: profilePicFile
        });
        
        // Update the UI with the new avatar URL if provided
        if (avatarUrl) {
          const preview = $('#profilePicPreview');
          preview.innerHTML = `<img src="${avatarUrl}" alt="Profile Picture">`;
        }
        
        // Update user display in the UI
        updateUserDisplay();
        
        showAuthStatus('Profile updated successfully!', 'success');
        showAuthLoading(false);
        
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          closeAuthModal();
        }, 2000);
        
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Failed to update profile: ' + error.message, 'error');
      }
    }
    
    // Function to update user metadata
    async function updateUserMetadata(name, avatarUrl) {
      const { error } = await window.supabaseClient.auth.updateUser({
        data: {
          full_name: name,
          avatar_url: avatarUrl,
          profile_pic: avatarUrl
        }
      });
      
      if (error) throw error;
      
      showAuthStatus('Account updated successfully!', 'success');
      showAuthLoading(false);
      
      // Update the UI with new data
      updateUserDisplay();
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        closeAuthModal();
      }, 2000);
    }
    
    // Function to update user display in the UI
    async function updateUserDisplay() {
      if (currentUser) {
        const email = currentUser.email || '';
        
        // Update email display
        $('#userEmail').textContent = email;
        
        try {
          // Load profile data from user_settings table
          const { row, avatarUrl } = await loadProfile();
          
          if (row) {
            // Use data from user_settings
            const name = row.full_name || 'User';
            $('#userName').textContent = name;
            
            // Update profile picture in dropdown if available
            if (avatarUrl) {
              const userPhoto = $('#userPhoto');
              if (userPhoto) {
                userPhoto.src = avatarUrl;
                userPhoto.style.display = 'block';
              }
            }
          } else {
            // Fallback to user metadata
            const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User';
            $('#userName').textContent = name;
        
        // Update profile picture in dropdown if available
        const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.profile_pic;
        if (avatarUrl) {
          const userPhoto = $('#userPhoto');
          if (userPhoto) {
            userPhoto.src = avatarUrl;
            userPhoto.style.display = 'block';
          }
        }
          }
        } catch (error) {

          // Fallback to basic display
          const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User';
          $('#userName').textContent = name;
        }
      }
    }
    
    
    async function sendPasswordReset() {
      const email = $('#forgotEmail').value;
      
      if (!email) {
        showAuthStatus('Please enter your email address', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname
        });
        
        if (error) throw error;
        
        showAuthStatus('Password reset link sent! Check your email.', 'success');
        showAuthLoading(false);
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          closeAuthModal();
        }, 3000);
        
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Failed to send reset link: ' + error.message, 'error');
      }
    }
    
    async function updatePassword() {
      const newPassword = $('#newPassword').value;
      const confirmPassword = $('#confirmPassword').value;
      
      if (!newPassword || !confirmPassword) {
        showAuthStatus('Please fill in all fields', 'error');
        return;
      }
      
      if (newPassword.length < 6) {
        showAuthStatus('Password must be at least 6 characters', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showAuthStatus('Passwords do not match', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        const { error } = await window.supabaseClient.auth.updateUser({
          password: newPassword
        });
        
        if (error) throw error;
        
        showAuthStatus('Password updated successfully! You can now sign in.', 'success');
        showAuthLoading(false);
        
        // Clear password fields
        $('#newPassword').value = '';
        $('#confirmPassword').value = '';
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          closeAuthModal();
        }, 3000);
        
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Failed to update password: ' + error.message, 'error');
      }
    }
    
    async function changePassword() {
      const newPassword = $('#changeNewPassword').value;
      const confirmPassword = $('#changeConfirmPassword').value;
      
      if (!newPassword || !confirmPassword) {
        showAuthStatus('Please fill in all fields', 'error');
        return;
      }
      
      if (newPassword.length < 6) {
        showAuthStatus('New password must be at least 6 characters', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showAuthStatus('New passwords do not match', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        // Update password directly (user is already authenticated)
        const { error: updateError } = await window.supabaseClient.auth.updateUser({
          password: newPassword
        });
        
        if (updateError) throw updateError;
        
        showAuthStatus('Password changed successfully!', 'success');
        showAuthLoading(false);
        
        // Clear password fields
        $('#changeNewPassword').value = '';
        $('#changeConfirmPassword').value = '';
        
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          closeAuthModal();
        }, 2000);
        
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Failed to change password: ' + error.message, 'error');
      }
    }
    
    
    async function signInWithEmail() {
      const email = $('#authEmail').value;
      const password = $('#authPassword').value;
      
      if (!email || !password) {
        showAuthStatus('Please enter both email and password', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        // Try to sign in first
        let { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        // If sign in fails, check the error type
        if (error) {
          if (error.message.includes('email not confirmed') || error.message.includes('Email not confirmed')) {
            showAuthStatus('Please check your email and click the confirmation link before signing in.', 'error');
            showAuthLoading(false);
            return;
          } else if (error.message.includes('Invalid login credentials')) {
            showAuthStatus('Invalid email or password. Please try again.', 'error');
            showAuthLoading(false);
            return;
          } else {
            throw error;
          }
        }
        
        // Sign in was successful
        showAuthStatus('Sign in successful!', 'success');
        showAuthLoading(false);
        closeAuthModal();
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Sign in failed: ' + error.message, 'error');
      }
    }
    
    async function signUpWithEmail() {
      const email = $('#authEmail').value;
      const password = $('#authPassword').value;
      
      if (!email || !password) {
        showAuthStatus('Please enter both email and password', 'error');
        return;
      }
      
      if (password.length < 6) {
        showAuthStatus('Password must be at least 6 characters', 'error');
        return;
      }
      
      try {
        showAuthLoading(true);
        clearAuthStatus();
        
        const { data, error } = await window.supabaseClient.auth.signUp({
          email: email,
          password: password
        });
        
        if (error) throw error;
        
        showAuthStatus('Account created! Please check your email to confirm.', 'success');
        showAuthLoading(false);
      } catch (error) {

        showAuthLoading(false);
        showAuthStatus('Sign up failed: ' + error.message, 'error');
      }
    }
    
    async function signOut() {
      try {
        await window.supabaseClient.auth.signOut();
        showSuccessNotification('Signed out successfully!');
        
        // Clear all data immediately
        clearAllData();
        
        // Refresh the page after a short delay to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } catch (error) {

        showErrorNotification('Sign out failed. Please try again.');
      }
    }
    
    async function createUserDocument(user) {
      // Supabase automatically creates user profiles, no need to manually create

    }
    
    // Check if storage bucket exists (can't create from client due to RLS)
    async function checkStorageBucket() {
      try {
        const { data: buckets, error } = await window.supabaseClient.storage.listBuckets();
        if (error) {

          return false;
        }
        
        const customIconsBucket = buckets.find(bucket => bucket.id === 'custom-icons');
        if (customIconsBucket) {

          return true;
        } else {

          return false;
        }
      } catch (error) {

        return false;
      }
    }
    
    // Upload image to Supabase storage
    async function uploadImageToSupabase(imageData) {

      
      if (!supabaseReady || !currentUser) {

        throw new Error('Supabase not ready or user not authenticated');
      }
      
      // Check if storage bucket exists
      const bucketExists = await checkStorageBucket();
      if (!bucketExists) {
        throw new Error('custom-icons storage bucket does not exist. Please create it in Supabase dashboard.');
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `custom-icons/${currentUser.id}/${timestamp}_${randomId}.svg`;

      
      // Convert data URL to blob
      const response = await fetch(imageData);
      const blob = await response.blob();

      
      // Upload to Supabase storage




      
      const { data, error } = await window.supabaseClient.storage
        .from('custom-icons')
        .upload(filename, blob, {
          contentType: 'image/svg+xml',
          upsert: false
        });
      
      if (error) {


        throw error;
      }
      


      
      // Get public URL
      const { data: urlData } = window.supabaseClient.storage
        .from('custom-icons')
        .getPublicUrl(filename);
      

      
      // Save to user_settings instead of separate table

      
      // First, get ALL existing user settings
      const { data: existingSettings, error: fetchError } = await window.supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {

        throw fetchError;
      }
      
      let customIcons = [];
      if (existingSettings && existingSettings.custom_icons) {
        try {
          customIcons = JSON.parse(existingSettings.custom_icons);

        } catch (e) {

          customIcons = [];
        }
      }
      
      // Add new icon
      const newIcon = {
        id: `${timestamp}_${randomId}`,
        type: 'image',
        data: urlData.publicUrl,
        name: 'Custom Image',
        created_at: new Date().toISOString()
      };
      
      customIcons.push(newIcon);

      
      // Try to update first, if that fails, try to insert
      let { error: dbError } = await window.supabaseClient
        .from('user_settings')
        .update({
          custom_icons: JSON.stringify(customIcons)
        })
        .eq('user_id', currentUser.id);
      
      // If update fails (no existing record), try to insert
      if (dbError) {

        const { error: insertError } = await window.supabaseClient
          .from('user_settings')
          .insert({
            user_id: currentUser.id,
            custom_icons: JSON.stringify(customIcons),
            fx_rate: 30.0,
            theme: 'dark',
            autosave: true,
            include_annual_in_monthly: false,
            inputs_locked: false
          });
        
        if (insertError) {

          throw insertError;
        } else {

        }
      } else {

      }
      
      return urlData.publicUrl;
    }
    
    // Load custom images from Supabase user_settings
    async function loadCustomImagesFromSupabase() {
      if (!supabaseReady || !currentUser) {
        return [];
      }
      
      try {
        const { data, error } = await window.supabaseClient
          .from('user_settings')
          .select('custom_icons')
          .eq('user_id', currentUser.id)
          .single();
        
        if (error) {

          return [];
        }
        
        if (data && data.custom_icons) {
          try {
            const customIcons = JSON.parse(data.custom_icons);

            return customIcons;
          } catch (e) {

            return [];
          }
        }
        
        return [];
      } catch (error) {

        return [];
      }
    }
    
    // Analyze SVG content to determine its color type
    async function analyzeSVGColor(svgUrl) {
      try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();
        
        // Check for common white/light color patterns
        const whitePatterns = [
          /fill\s*=\s*["']#ffffff["']/i,
          /fill\s*=\s*["']white["']/i,
          /fill\s*=\s*["']#fff["']/i,
          /fill\s*=\s*["']#f[f0-9]{5}["']/i, // #fff000, #ffffff, etc.
          /stroke\s*=\s*["']#ffffff["']/i,
          /stroke\s*=\s*["']white["']/i,
          /stroke\s*=\s*["']#fff["']/i
        ];
        
        // Check for common black/dark color patterns
        const blackPatterns = [
          /fill\s*=\s*["']#000000["']/i,
          /fill\s*=\s*["']black["']/i,
          /fill\s*=\s*["']#000["']/i,
          /fill\s*=\s*["']#0{6}["']/i,
          /stroke\s*=\s*["']#000000["']/i,
          /stroke\s*=\s*["']black["']/i,
          /stroke\s*=\s*["']#000["']/i
        ];
        
        // Check for colored patterns (not black or white)
        const coloredPatterns = [
          /fill\s*=\s*["']#[0-9a-f]{6}["']/i,
          /fill\s*=\s*["']#[0-9a-f]{3}["']/i,
          /fill\s*=\s*["']rgb\(/i,
          /fill\s*=\s*["']rgba\(/i,
          /stroke\s*=\s*["']#[0-9a-f]{6}["']/i,
          /stroke\s*=\s*["']#[0-9a-f]{3}["']/i,
          /stroke\s*=\s*["']rgb\(/i,
          /stroke\s*=\s*["']rgba\(/i
        ];
        
        const hasWhite = whitePatterns.some(pattern => pattern.test(svgText));
        const hasBlack = blackPatterns.some(pattern => pattern.test(svgText));
        const hasColored = coloredPatterns.some(pattern => pattern.test(svgText));
        
        // Determine SVG type based on content analysis
        if (hasWhite && !hasBlack && !hasColored) {
          return 'white';
        } else if (hasBlack && !hasWhite && !hasColored) {
          return 'black';
        } else if (hasColored) {
          return 'colored';
        } else {
          // Default to black if no specific colors found
          return 'black';
        }
      } catch (error) {

        return 'black'; // Default fallback
      }
    }
    
    // Apply smart SVG inversion based on analysis
    async function applySmartSVGInversion(imgElement) {
      if (!imgElement || !imgElement.src) return;
      
      try {
        const svgType = await analyzeSVGColor(imgElement.src);
        imgElement.setAttribute('data-svg-type', svgType);

      } catch (error) {

        // Fallback to default behavior
        imgElement.setAttribute('data-svg-type', 'black');
      }
    }
    
    // Prevent multiple simultaneous data loading
    let isLoadingData = false;
    
    async function loadUserData() {



      
      // Prevent multiple simultaneous loads
      if (isLoadingData) {

        return;
      }
      
      if (!currentUser) {

        return;
      }
      
      if (!supabaseReady) {

        showNotification('Database connection not ready. Using local data only.', 'error');
        loadLocalData();
        return;
      }
      
      isLoadingData = true;
      
      // Check for CORS issues and fallback to local data
      try {
        // Test connection first with a simple query
        const { data: testData, error: testError } = await window.supabaseClient
          .from('user_settings')
          .select('id')
          .eq('user_id', currentUser.id)
          .limit(1);
          
        if (testError && (testError.message.includes('CORS') || testError.message.includes('Failed to fetch') || testError.message.includes('431'))) {

          showNotification('Cloud sync unavailable. Using local data only.', 'warning');
          loadLocalData();
          return;
        }
      } catch (error) {
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('431')) {

          showNotification('Cloud sync unavailable. Using local data only.', 'warning');
          loadLocalData();
          return;
        }
      }
      
      try {



        
        // CRITICAL: Clear existing data to prevent duplication

        state.personal = [];
        state.biz = [];
        state.income = {};
        
        // Load custom icons from localStorage first
        loadCustomIcons();
        
        // Start all requests in parallel for maximum speed

        const [settingsResult, personalResult, businessResult, incomeResult] = await Promise.allSettled([
        // Load user settings
          window.supabaseClient
          .from('user_settings')
          .select('*')
          .eq('user_id', currentUser.id)
            .single(),
            
          // Load personal expenses
          window.supabaseClient
            .from('personal_expenses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('order', { ascending: true })
            .order('created_at', { ascending: true }),
            
          // Load business expenses
          window.supabaseClient
            .from('business_expenses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('order', { ascending: true })
            .order('created_at', { ascending: true }),
            
          // Load income data
          window.supabaseClient
            .from('income')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('year', { ascending: true })
            .order('order', { ascending: true })
            .order('created_at', { ascending: true })
        ]);
        





        
        // Process settings
        if (settingsResult.status === 'fulfilled' && settingsResult.value.data) {
          const settings = settingsResult.value.data;
          state.fx = settings.fx_rate || 48.1843;
          state.theme = settings.theme || 'dark';
          state.autosave = settings.autosave ? 'on' : 'off';
          state.includeAnnualInMonthly = settings.include_annual_in_monthly === true || settings.include_annual_in_monthly === 'true' || false;
          // Handle inputs_locked properly - only default to false if it's explicitly null/undefined
          // If the user has never set it, preserve their current state or default to false
          if (settings.inputs_locked === null || settings.inputs_locked === undefined) {
            // If database has null/undefined, preserve current state or default to false
            state.inputsLocked = state.inputsLocked !== undefined ? state.inputsLocked : false;
          } else {
            // If database has a value, use it
            state.inputsLocked = settings.inputs_locked === true || settings.inputs_locked === 'true';
          }
          columnOrder = settings.column_order || ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'];
          
          // Update UI elements to reflect loaded settings
          updateSettingsUI();
          
          // Apply lock state after loading settings
          if (typeof updateLockIcon === 'function') {
          updateLockIcon();
          }
          if (typeof updateInputsLockState === 'function') {
          updateInputsLockState();
          }
          
          // Ensure user settings exist with current lock state
          ensureUserSettingsExist();
        }
        
        // Process personal expenses
        if (personalResult.status === 'fulfilled' && personalResult.value.data) {
          const personalExpenses = personalResult.value.data;
          state.personal = personalExpenses.map(expense => {
            const row = {
            name: expense.name,
            cost: expense.cost,
            status: expense.status,
            billing: expense.billing,
              monthlyUSD: expense.monthly_usd || 0,
              yearlyUSD: expense.yearly_usd || 0,
              monthlyEGP: expense.monthly_egp || 0,
              yearlyEGP: expense.yearly_egp || 0,
            icon: expense.icon,
            order: expense.order || 0,
            id: expense.id
            };
            // Ensure financial values are calculated if missing
            if (!row.monthlyUSD) row.monthlyUSD = rowMonthlyUSD(row);
            if (!row.yearlyUSD) row.yearlyUSD = rowYearlyUSD(row);
            if (!row.monthlyEGP) row.monthlyEGP = row.monthlyUSD * state.fx;
            if (!row.yearlyEGP) row.yearlyEGP = row.yearlyUSD * state.fx;
            return row;
          });
        }
        
        // Process business expenses
        if (businessResult.status === 'fulfilled' && businessResult.value.data) {
          const businessExpenses = businessResult.value.data;
          state.biz = businessExpenses.map(expense => {
            const row = {
            name: expense.name,
            cost: expense.cost,
            status: expense.status,
            billing: expense.billing,
            next: expense.next_payment ? new Date(expense.next_payment).toISOString().split('T')[0] : '',
              monthlyUSD: expense.monthly_usd || 0,
              yearlyUSD: expense.yearly_usd || 0,
              monthlyEGP: expense.monthly_egp || 0,
              yearlyEGP: expense.yearly_egp || 0,
            icon: expense.icon,
            order: expense.order || 0,
            id: expense.id
            };
            // Ensure financial values are calculated if missing
            if (!row.monthlyUSD) row.monthlyUSD = rowMonthlyUSD(row);
            if (!row.yearlyUSD) row.yearlyUSD = rowYearlyUSD(row);
            if (!row.monthlyEGP) row.monthlyEGP = row.monthlyUSD * state.fx;
            if (!row.yearlyEGP) row.yearlyEGP = row.yearlyUSD * state.fx;
            return row;
          });
        }
        
        // Process income data
        if (incomeResult.status === 'fulfilled' && incomeResult.value.data) {
          const incomeData = incomeResult.value.data;
          // Completely clear and replace income data with Supabase data
          const newIncomeData = {};
          
          // Group income data by year
          incomeData.forEach(income => {
            const year = income.year.toString();
            if (!newIncomeData[year]) {
              newIncomeData[year] = [];
            }
            newIncomeData[year].push({
              name: income.name,
              tags: income.tags,
              date: income.date,
              allPayment: income.all_payment,
              paidUsd: income.paid_usd,
              method: income.method,
              icon: income.icon || 'fa:dollar-sign', // Default icon if not in schema
              order: income.order || 0,
              id: income.id
            });
          });
          
          // Replace state.income with fresh data from Supabase
          state.income = newIncomeData;
          
          // Update available_years in settings to include all years from income data
          const incomeYears = Object.keys(state.income).map(year => parseInt(year)).sort((a, b) => a - b);
          
          // Create year tabs for all years found in Supabase data
          createYearTabsFromData(state.income);
        } else {
          // If no income data in Supabase, keep the years that were initialized from settings
          // but ensure we have at least the default years
          if (!state.income || Object.keys(state.income).length === 0) {
            state.income = {
              '2022': [],
              '2023': [],
              '2024': [],
              '2025': []
            };
          }
          createYearTabsFromData(state.income);
        }
        
        // Check for and fix duplicates in the database
        await checkAndFixDuplicates();
        
        renderAll();
        showSuccessNotification('Data loaded from cloud!');
        
      } catch (error) {
        
        // Check if it's a CORS or network error
        if (error.message.includes('CORS') || error.message.includes('Network') || error.message.includes('fetch')) {
          showNotification('Network error. Check your internet connection and try again.', 'error');
        } else if (error.message.includes('JWT') || error.message.includes('auth')) {
          showNotification('Authentication error. Please sign in again.', 'error');
        } else {
          showNotification('Failed to load cloud data. Using local data.', 'error');
        }
        
        loadLocalData();
        
        // Ensure user settings exist even if no data was loaded
        ensureUserSettingsExist();
      } finally {
        // Always reset the loading flag
        isLoadingData = false;
      }
    }
    
    // Function to check and fix duplicates in the database
    async function checkAndFixDuplicates() {
      if (!currentUser || !supabaseReady) return;
      

      
      try {
        // Check for duplicate personal expenses
        const { data: personalData } = await window.supabaseClient
          .from('personal_expenses')
          .select('*')
          .eq('user_id', currentUser.id);
          
        if (personalData) {
          const seen = new Set();
          const duplicates = [];
          
          personalData.forEach(expense => {
            const key = `${expense.name}_${expense.cost}_${expense.billing}`;
            if (seen.has(key)) {
              duplicates.push(expense.id);
            } else {
              seen.add(key);
            }
          });
          
          if (duplicates.length > 0) {

            await window.supabaseClient
              .from('personal_expenses')
              .delete()
              .in('id', duplicates);
          }
        }
        
        // Check for duplicate business expenses
        const { data: businessData } = await window.supabaseClient
          .from('business_expenses')
          .select('*')
          .eq('user_id', currentUser.id);
          
        if (businessData) {
          const seen = new Set();
          const duplicates = [];
          
          businessData.forEach(expense => {
            const key = `${expense.name}_${expense.cost}_${expense.billing}`;
            if (seen.has(key)) {
              duplicates.push(expense.id);
            } else {
              seen.add(key);
            }
          });
          
          if (duplicates.length > 0) {

            await window.supabaseClient
              .from('business_expenses')
              .delete()
              .in('id', duplicates);
          }
        }
        
        // Check for duplicate income
        const { data: incomeData } = await window.supabaseClient
          .from('income')
          .select('*')
          .eq('user_id', currentUser.id);
          
        if (incomeData) {
          const seen = new Set();
          const duplicates = [];
          
          incomeData.forEach(income => {
            const key = `${income.name}_${income.date}_${income.all_payment}`;
            if (seen.has(key)) {
              duplicates.push(income.id);
            } else {
              seen.add(key);
            }
          });
          
          if (duplicates.length > 0) {

            await window.supabaseClient
              .from('income')
              .delete()
              .in('id', duplicates);
          }
        }
        

        
      } catch (error) {

      }
    }
    
    function loadLocalData() {

      
      // Load custom icons from localStorage
      loadCustomIcons();
      
      // Fallback to localStorage - COMPLETELY REPLACE state, don't merge
      const stored = localStorage.getItem('finance-notion-v6');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          
          // Completely reset state to avoid merging
          // Preserve current lock state if it exists
          const currentLockState = state.inputsLocked !== undefined ? state.inputsLocked : false;
          state = {
            personal: parsed.personal || [],
            biz: parsed.biz || [],
            income: {},
            fx: parsed.fx || 48.1843,
            theme: parsed.theme || 'dark',
            autosave: parsed.autosave || 'on',
            includeAnnualInMonthly: parsed.includeAnnualInMonthly || true,
            inputsLocked: currentLockState
          };
          
          // Handle migration from old income structure to new year-based structure
          if (parsed.income) {
            if (Array.isArray(parsed.income)) {
              // Old structure - migrate to current year
              state.income[currentYear] = parsed.income;
            } else {
              // New structure - use as is
              state.income = parsed.income;
            }
          }
        } catch (e) {

        }
      } else {

        // No local data - initialize with default empty state
        // Preserve current lock state if it exists
        const currentLockState = state.inputsLocked !== undefined ? state.inputsLocked : false;
        state = {
          personal: [],
          biz: [],
          income: {
            '2022': [],
            '2023': [],
            '2024': [],
            '2025': []
          },
          fx: 48.1843,
          theme: 'dark',
          autosave: 'on',
          includeAnnualInMonthly: true,
          inputsLocked: currentLockState
        };
      }
      
      // Ensure income structure exists
      if (!state.income || typeof state.income !== 'object') {
        state.income = {
          '2022': [],
          '2023': [],
          '2024': [],
          '2025': []
        };
      }
      

      
      // Initialize row order properties for existing rows
      initializeRowOrder();
      
      // Initialize currency system before rendering
      initializeCurrencySystem();
      
      renderAll();
    }
    
    function clearAllData() {
      // Clear all data from state
      state.personal = [];
      state.biz = [];
      state.income = {
        2022: [],
        2023: [],
        2024: [],
        2025: []
      };
      state.fx = 48.1843;
      state.theme = 'dark';
      state.autosave = 'on';
      state.includeAnnualInMonthly = true;
      columnOrder = ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'];
      
      // Clear local storage
      localStorage.removeItem('finance-notion-v6');
      localStorage.removeItem('columnOrder');
      
      // Re-render with empty data
      renderAll();
      

    }
    
    
    async function saveToSupabase() {
      console.log('💾 saveToSupabase called:', { 
        hasUser: !!currentUser, 
        supabaseReady,
        personalCount: state.personal.length,
        bizCount: state.biz.length,
        incomeYears: Object.keys(state.income).length
      });
      
      if (!currentUser || !supabaseReady) {
        console.log('❌ Cannot save to Supabase: no user or not ready');
        return;
      }
      
      try {
        // Get all available years from income data
        const availableYears = Object.keys(state.income).map(year => parseInt(year)).sort((a, b) => a - b);

        
        // Save user settings
        
        await window.supabaseClient
          .from('user_settings')
          .upsert({
            user_id: currentUser.id,
            fx_rate: state.fx,
            theme: state.theme,
            autosave: state.autosave === 'on',
            include_annual_in_monthly: state.includeAnnualInMonthly,
            column_order: columnOrder,
            available_years: availableYears,
            inputs_locked: state.inputsLocked
          }, {
            onConflict: 'user_id'
          });
        
        // Save personal expenses
        for (const expense of state.personal) {
          if (expense.id) {
            // Update existing expense
            await window.supabaseClient
              .from('personal_expenses')
              .update({
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .eq('id', expense.id);
          } else {
            // Create new expense
            const { data: newExpense, error } = await window.supabaseClient
              .from('personal_expenses')
              .insert({
                user_id: currentUser.id,
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .select()
              .single();
            
            if (newExpense) {
              expense.id = newExpense.id;
            }
          }
        }
        
        // Save business expenses
        for (const expense of state.biz) {
          if (expense.id) {
            // Update existing expense
            await window.supabaseClient
              .from('business_expenses')
              .update({
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                next_payment: expense.next ? new Date(expense.next).toISOString().split('T')[0] : null,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .eq('id', expense.id);
          } else {
            // Create new expense
            const { data: newExpense, error } = await window.supabaseClient
              .from('business_expenses')
              .insert({
                user_id: currentUser.id,
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                next_payment: expense.next ? new Date(expense.next).toISOString().split('T')[0] : null,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .select()
              .single();
            
            if (newExpense) {
              expense.id = newExpense.id;
            }
          }
        }
        
        // Save income data for all years

        let incomeSaveCount = 0;
        let incomeErrorCount = 0;
        
        for (const [year, incomeData] of Object.entries(state.income)) {

          
          for (const income of incomeData) {
            try {

              
              if (income.id) {
                // Update existing income
                const { error: updateError } = await window.supabaseClient
                  .from('income')
                  .update({
                    name: income.name || '',
                    tags: income.tags || '',
                    date: income.date || new Date().toISOString().split('T')[0],
                    all_payment: income.allPayment || 0,
                    paid_usd: income.paidUsd || 0,
                    method: income.method || 'Bank Transfer',
                    icon: income.icon || 'fa:dollar-sign',
                    year: parseInt(year),
                    order: income.order || 0
                  })
                  .eq('id', income.id);
                
                if (updateError) {

                  incomeErrorCount++;
                } else {

                  incomeSaveCount++;
                }
              } else {
                // Create new income
                const { data: newIncome, error: insertError } = await window.supabaseClient
                  .from('income')
                  .insert({
                    user_id: currentUser.id,
                    name: income.name || '',
                    tags: income.tags || '',
                    date: income.date || new Date().toISOString().split('T')[0],
                    all_payment: income.allPayment || 0,
                    paid_usd: income.paidUsd || 0,
                    paid_egp: income.paidEgp || null,
                    method: income.method || 'Bank Transfer',
                    icon: income.icon || 'fa:dollar-sign',
                    year: parseInt(year),
                    order: income.order || 0
                  })
                  .select()
                  .single();
                
                if (insertError) {

                  incomeErrorCount++;
                } else if (newIncome) {
                  income.id = newIncome.id;

                  incomeSaveCount++;
                }
              }
            } catch (error) {

              incomeErrorCount++;
            }
          }
        }
        

        
        console.log('✅ Supabase save completed successfully');
        showSaveIndicator();
      } catch (error) {
        console.error('❌ Supabase save failed:', error);
        showSaveError();
      }
    }
    
    function saveToLocal() {
      try {
        localStorage.setItem('finance-notion-v6', JSON.stringify(state));
        localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
        showSaveIndicator();
      } catch (error) {

        showSaveError();
      }
    }
    
    // Original localStorage key for fallback
    const LS_KEY = 'finance-notion-v6';



    const defaultState = {
      fx: 48.1843,
      autosave: 'on',
      autosaveInterval: 15,
      theme: 'dark',
        includeAnnualInMonthly: false,
      inputsLocked: false,
      // Currency system
      selectedCurrency: 'EGP',
      currencySymbol: 'EGP',
      currencyRate: 48.1843, // Rate from USD to selected currency
      personal: [],
      biz: [],
      income: {
        2022: [],
        2023: [],
        2024: [],
        2025: []
      }
    };

    function load(){ 
      // This function is now handled by loadUserData() and loadLocalData()
      return structuredClone(defaultState);
    }
    
    // Enhanced local data loading with sample data
    function loadLocalData() {

      
      // Try to load from localStorage first
      const saved = localStorage.getItem('finance-notion-v6');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {

            state.personal = parsed.personal || [];
            state.biz = parsed.biz || [];
            const currentYear = new Date().getFullYear();
            state.income = parsed.income || { 
              [currentYear - 1]: [], 
              [currentYear]: [], 
              [currentYear + 1]: [] 
            };
            state.fx = parsed.fx || 48.1843;
            state.theme = parsed.theme || 'dark';
            state.autosave = parsed.autosave || 'on';
            state.includeAnnualInMonthly = parsed.includeAnnualInMonthly !== undefined ? parsed.includeAnnualInMonthly : true;
            // Handle inputs_locked properly - preserve the actual value from localStorage
            state.inputsLocked = parsed.inputsLocked !== undefined ? parsed.inputsLocked : false;
            
            // Load column order
            const savedColumnOrder = localStorage.getItem('columnOrder');
            if (savedColumnOrder) {
              columnOrder = JSON.parse(savedColumnOrder);
            }
            
            // Initialize currency system before rendering
            initializeCurrencySystem();
            
            renderAll();
            return;
          }
        } catch (error) {

        }
      }
      
      // If no saved data, initialize with empty state
      // Preserve current lock state if it exists, otherwise default to false
      const currentLockState = state.inputsLocked !== undefined ? state.inputsLocked : false;

      state.personal = [];
      state.biz = [];
      state.income = {}; // Start with empty income object
      state.fx = 48.1843;
      state.theme = 'dark';
      state.autosave = 'on';
      state.includeAnnualInMonthly = true;
      state.inputsLocked = currentLockState;
      
      // Create year tabs (will create default years since income is empty)
      createYearTabsFromData(state.income);
      
      // Initialize currency system before rendering
      initializeCurrencySystem();
      
      renderAll();
    }
    
    function save(source = 'general'){ 
      console.log('💾 save() called:', { 
        source, 
        inputsLocked: state.inputsLocked, 
        hasUser: !!currentUser, 
        supabaseReady,
        hasOptimizedSave: typeof window.saveOptimized === 'function'
      });
      
      // Check if lock is active - if so, only save locally, not to cloud
      if (state.inputsLocked && currentUser && supabaseReady) {
        console.log('🔒 Inputs locked, saving locally only');
        saveToLocal();
        return;
      }
      
      // If user is signed in, use instant save for fast cloud sync
      if (currentUser && supabaseReady) {
        console.log('🚀 Using instant save for cloud sync');
        instantSaveAll(source);
      } else {
        console.log('💾 Using local save only');
        // Fallback to regular live save for local storage
        liveSave(source);
      }
    }
    
    // Autocomplete functionality
    function saveInputValue(field, value) {
      if (!value || value.trim() === '') return;
      
      if (!state.autocomplete) {
        state.autocomplete = {};
      }
      
      if (!state.autocomplete[field]) {
        state.autocomplete[field] = [];
      }
      
      // Add value if not already exists
      if (!state.autocomplete[field].includes(value.trim())) {
        state.autocomplete[field].unshift(value.trim());
        // Keep only last 10 values
        if (state.autocomplete[field].length > 10) {
          state.autocomplete[field] = state.autocomplete[field].slice(0, 10);
        }
        save();
      }
    }
    
    function getAutocompleteValues(field) {
      return state.autocomplete && state.autocomplete[field] ? state.autocomplete[field] : [];
    }
    
    function addAutocompleteToInput(input, field) {
      const autocompleteValues = getAutocompleteValues(field);
      if (autocompleteValues.length > 0) {
        input.setAttribute('list', `autocomplete-${field}`);
        
        // Create or update datalist
        let datalist = document.getElementById(`autocomplete-${field}`);
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = `autocomplete-${field}`;
          document.body.appendChild(datalist);
        }
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add options
        autocompleteValues.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          datalist.appendChild(option);
        });
      }
    }
  
  // 🧠 SMART NOTIFICATION SYSTEM
  class SmartNotificationSystem {
    constructor() {
      this.messageQueue = [];
      this.isShowing = false;
      this.lastMessage = null;
      this.lastMessageTime = 0;
      this.messageHistory = new Set();
      this.suppressedTypes = new Set(['save', 'info']); // Don't show these by default
      this.context = {
        isBulkOperation: false,
        isUserAction: false,
        isSystemAction: false,
        lastActionTime: 0
      };
    }
    
    // Main notification function - now smart!
    show(message, type = 'success', duration = 3000, options = {}) {
      const notification = {
        message,
        type,
        duration,
        timestamp: Date.now(),
        priority: this.getPriority(type),
        context: { ...this.context, ...options }
      };
      
      // Smart filtering
      if (this.shouldSuppress(notification)) {
        return;
      }
      
      // Add to queue
      this.messageQueue.push(notification);
      
      // Process queue
      this.processQueue();
    }
    
    // Smart suppression logic
    shouldSuppress(notification) {
      const { message, type, timestamp } = notification;
      
      // Suppress duplicate messages within 2 seconds
      if (this.lastMessage === message && (timestamp - this.lastMessageTime) < 2000) {
        return true;
      }
      
      // Suppress low-priority messages during bulk operations
      if (this.context.isBulkOperation && notification.priority < 3) {
        return true;
      }
      
      // Suppress system messages if user just performed an action
      if (this.context.isUserAction && (timestamp - this.context.lastActionTime) < 1000) {
        return true;
      }
      
      // Suppress certain types by default
      if (this.suppressedTypes.has(type) && !notification.context.force) {
        return true;
      }
      
      return false;
    }
    
    // Get message priority (1-5, 5 being highest)
    getPriority(type) {
      const priorities = {
        'error': 5,
        'warning': 4,
        'success': 3,
        'info': 2,
        'save': 1
      };
      return priorities[type] || 2;
    }
    
    // Process message queue
    async processQueue() {
      if (this.isShowing || this.messageQueue.length === 0) return;
      
      this.isShowing = true;
      
      // Sort by priority and timestamp
      this.messageQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Earlier timestamp first
      });
      
      const notification = this.messageQueue.shift();
      await this.displayNotification(notification);
      
      this.isShowing = false;
      
      // Process next message after a short delay
      if (this.messageQueue.length > 0) {
        setTimeout(() => this.processQueue(), 500);
      }
    }
    
    // Display the actual notification
    async displayNotification(notification) {
      const { message, type, duration } = notification;
    const notificationCenter = document.getElementById('notificationCenter');
    const text = notificationCenter.querySelector('.notification-text');
      
      // Update last message tracking
      this.lastMessage = message;
      this.lastMessageTime = notification.timestamp;
    
    // Set message
    text.textContent = message;
    
    // Set type class for glow effect
    notificationCenter.className = `notification-center ${type}`;
    
    // Show notification
    notificationCenter.style.opacity = '1';
    notificationCenter.style.transform = 'translate(-50%, 0) translateX(0)';
    notificationCenter.classList.add('show');
    
    // Hide after duration
      await new Promise(resolve => {
    setTimeout(() => {
      notificationCenter.classList.remove('show');
      notificationCenter.classList.add('hide');
      setTimeout(() => {
        notificationCenter.style.opacity = '0';
        notificationCenter.style.transform = 'translate(-50%, 0) translateX(20px)';
        notificationCenter.classList.remove('hide');
            resolve();
      }, 300);
    }, duration);
      });
    }
    
    // Context management
    setContext(context) {
      this.context = { ...this.context, ...context };
    }
    
    // Suppress certain message types
    suppressTypes(types) {
      types.forEach(type => this.suppressedTypes.add(type));
    }
    
    // Allow certain message types
    allowTypes(types) {
      types.forEach(type => this.suppressedTypes.delete(type));
    }
    
    // Clear queue
    clearQueue() {
      this.messageQueue = [];
    }
    
    // Get queue status
    getQueueStatus() {
      return {
        queueLength: this.messageQueue.length,
        isShowing: this.isShowing,
        suppressedTypes: Array.from(this.suppressedTypes)
      };
    }
  }
  
  // Global smart notification instance
  const smartNotifications = new SmartNotificationSystem();
  
  // Main notification function - now uses smart system
  function showNotification(message, type = 'success', duration = 3000, options = {}) {
    smartNotifications.show(message, type, duration, options);
  }
  
  // Smart notification helpers for common scenarios
  function showUserActionNotification(message, type = 'success', duration = 2000) {
    smartNotifications.setContext({ 
      isUserAction: true, 
      lastActionTime: Date.now() 
    });
    showNotification(message, type, duration, { force: true });
  }
  
  function showBulkOperationNotification(message, type = 'info', duration = 3000) {
    smartNotifications.setContext({ isBulkOperation: true });
    showNotification(message, type, duration, { force: true });
  }
  
  function showErrorNotification(message, duration = 4000) {
    showNotification(message, 'error', duration, { force: true });
  }
  
  function showSuccessNotification(message, duration = 2000) {
    showNotification(message, 'success', duration, { force: true });
  }
  
  // Debug function to check notification system status
  function getNotificationStatus() {
    return smartNotifications.getQueueStatus();
  }
  
  // Smart notification summary for bulk operations
  function showBulkOperationSummary(operation, totalItems, successCount, errorCount = 0) {
    const context = smartNotifications.getQueueStatus();
    
    if (context.isBulkOperation) {
      smartNotifications.setContext({ isBulkOperation: false });
      
      if (errorCount === 0) {
        showSuccessNotification(`✅ ${operation} completed: ${successCount} items processed`);
      } else {
        showNotification(`⚠️ ${operation} completed: ${successCount}/${totalItems} items processed (${errorCount} failed)`, 'warning', 4000, { force: true });
      }
    }
  }
  
  // Initialize smart notification system with optimal settings
  function initializeSmartNotifications() {
    // Suppress common spam types
    smartNotifications.suppressTypes(['save', 'info']);
    
    // Allow important types
    smartNotifications.allowTypes(['error', 'warning', 'success']);
    

  }
  
  // Call initialization when script loads
  initializeSmartNotifications();
  
  function showSaveIndicator() {
    // Only show save indicator for important saves, not every keystroke
    if (currentUser && supabaseReady) {
      showNotification('Synced to cloud', 'success', 1500, { priority: 2 });
    } else {
      // Don't show local save notifications - they're not important
      return;
    }
  }
  
  function showSaveError() {
    // Always show errors - they're important
    if (currentUser && supabaseReady) {
      showNotification('Cloud sync failed', 'error', 3000, { force: true });
    } else {
      showNotification('Save failed', 'error', 3000, { force: true });
    }
  }

    let state = structuredClone(defaultState);
    
    // Initialize column order from localStorage or default
    const defaultColumnOrder = ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'];
    let columnOrder = defaultColumnOrder;
    
    // Initialize autosave status
    updateAutosaveStatus();
    
    
    
    // Simplified system - no trial/license restrictions
    function hasFullAccess() { return true; }
    function isTrialExpired() { return false; }
    function isLicenseValid() { return true; }
    function setLicense(license) { return true; }
    function enableAllFunctions() { /* All functions enabled by default */ }
    function disableAllFunctions() { /* No restrictions */ }
    function getTrialDaysRemaining() { return 999; }

    // Theme
    function applyTheme(){ 
      document.documentElement.setAttribute('data-theme', state.theme==='light' ? 'light':'dark'); 
      const themeIcon = $('#iconTheme');
      if (state.theme === 'light') {
        // Show moon icon for light mode
        themeIcon.innerHTML = '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
      } else {
        // Show sun icon for dark mode
        themeIcon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
      }
    }
    applyTheme();
    $('#btnTheme').addEventListener('click', ()=>{ state.theme = state.theme==='light'?'dark':'light'; save(); applyTheme(); });

    // Lock/Unlock functionality
    $('#btnLock').addEventListener('click', toggleInputsLock);
    
    function updateLockIcon() {
      const lockIcon = $('#iconLock');
      const lockBtn = $('#btnLock');
      
      if (state.inputsLocked) {
        // Show open lock icon when inputs are locked (unlock state)
        lockIcon.innerHTML = '<path d="M8 11V7a4 4 0 0 1 8 0v4"/><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M12 15v2"/>';
        lockBtn.title = 'Unlock all inputs';
        lockBtn.style.borderColor = 'var(--primary)';
        lockBtn.style.background = 'rgba(var(--primary-rgb), 0.1)';
      } else {
        // Show closed lock icon when inputs are unlocked (lock state)
        lockIcon.innerHTML = '<path d="M12 15v2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>';
        lockBtn.title = 'Lock all inputs';
        lockBtn.style.borderColor = 'var(--stroke)';
        lockBtn.style.background = 'transparent';
      }
    }
    
    function toggleInputsLock() {
      state.inputsLocked = !state.inputsLocked;
      updateLockIcon();
        updateInputsLockState();
        
        // Handle method trigger arrows - hide when locked
        const allMethodTriggers = document.querySelectorAll('.method-trigger-minimal');
        allMethodTriggers.forEach(trigger => {
          if (state.inputsLocked) {
            trigger.classList.add('locked');
            // Hide the arrow icon specifically
            const arrowIcon = trigger.querySelector('svg, .arrow-icon');
            if (arrowIcon) {
              arrowIcon.style.display = 'none';
            }
          } else {
            trigger.classList.remove('locked');
            // Show the arrow icon again
            const arrowIcon = trigger.querySelector('svg, .arrow-icon');
            if (arrowIcon) {
              arrowIcon.style.display = '';
            }
          }
        });
        
        // Handle drag handles - make invisible with opacity 0 when locked
        const allDragHandles = document.querySelectorAll('.drag-handle');
        allDragHandles.forEach(handle => {
          if (state.inputsLocked) {
            handle.style.opacity = '0';
            handle.style.pointerEvents = 'none';
          } else {
            handle.style.opacity = '';
            handle.style.pointerEvents = '';
          }
        });
        
        // Immediately save lock state to localStorage
        saveToLocal();
        
        save('lock');
      
      // Save lock state to cloud if user is authenticated
      if (currentUser) {
        saveLockStateToCloud();
      }
    }
    
    function updateInputsLockState() {
      // Get all interactive elements
      const allInputs = document.querySelectorAll('input, select, textarea');
      const allButtons = document.querySelectorAll('.delete-btn, .icon-cell button');
      const allToggles = document.querySelectorAll('.status-toggle, .billing-toggle');
      const allFinancialInputs = document.querySelectorAll('.financial-input-wrapper, .calculated-div, .cost-input, [data-row-index]');
      const allDateInputs = document.querySelectorAll('.date-input-minimal, input[type="date"]');
      const allClickableElements = document.querySelectorAll('[onclick], [data-clickable]');
      const addRowButtons = document.querySelectorAll('button[data-add-row]');
      
      // Get income-specific elements
      const allIncomeInputs = document.querySelectorAll('.row-income input, .row-income select, .row-income textarea, .tag-input, .method-custom-input');
      const allIncomeClickable = document.querySelectorAll('.row-income .editable-value, .row-income .method-trigger-minimal, .row-income .tag-input-wrapper');
      
      // Get all X buttons and remove buttons from rows
      const allXButtons = document.querySelectorAll('.method-remove-btn, .tag-chip-remove, .year-btn-remove, .year-btn, .year-add-between, .year-add-btn');
      const allDeleteButtons = document.querySelectorAll('.delete-btn');
      
      // Get tag input fields specifically for hiding when locked
      const allTagInputs = document.querySelectorAll('.tag-input');
      
      // Combine all elements (excluding add row buttons for now)
      const allElements = [
        ...allInputs, 
        ...allButtons, 
        ...allToggles, 
        ...allFinancialInputs, 
        ...allDateInputs,
        ...allClickableElements,
        ...allIncomeInputs,
        ...allIncomeClickable
      ];
      
      // Filter out auth modal and settings modal elements - they should never be locked
      const filteredElements = allElements.filter(element => {
        // Check if element is inside auth modal
        const authModal = document.getElementById('authModal');
        if (authModal && authModal.contains(element)) {
          return false; // Exclude auth modal elements
        }
        
        // Check if element is inside settings modal
        const settingsModal = document.getElementById('settings');
        if (settingsModal && settingsModal.contains(element)) {
          return false; // Exclude settings modal elements
        }
        
        return true; // Include all other elements
      });
      
      filteredElements.forEach(element => {
        if (state.inputsLocked) {
          // Disable the element but keep its appearance
          element.disabled = true;
          element.style.pointerEvents = 'none';
          element.style.userSelect = 'none';
          
          // Add a subtle overlay to indicate it's locked without changing the original style
          if (!element.querySelector('.lock-indicator')) {
            const lockIndicator = document.createElement('div');
            lockIndicator.className = 'lock-indicator';
            lockIndicator.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.1);
              border-radius: inherit;
              pointer-events: none;
              z-index: 1;
            `;
            
            // Make parent relative if not already
            const computedStyle = getComputedStyle(element);
            if (computedStyle.position === 'static') {
              element.style.position = 'relative';
            }
            
            element.appendChild(lockIndicator);
          }
        } else {
          // Re-enable the element
          element.disabled = false;
          element.style.pointerEvents = 'auto';
          element.style.userSelect = 'auto';
          
          // Remove lock indicator
          const lockIndicator = element.querySelector('.lock-indicator');
          if (lockIndicator) {
            lockIndicator.remove();
          }
        }
      });
      
      // Handle "Add row" buttons - hide them when locked
      addRowButtons.forEach(button => {
        if (state.inputsLocked) {
          button.style.display = 'none';
        } else {
          button.style.display = '';
        }
      });
      
      // Handle X buttons and remove buttons - hide them when locked
      [...allXButtons, ...allDeleteButtons].forEach(button => {
        if (state.inputsLocked) {
          button.style.display = 'none';
        } else {
          button.style.display = '';
        }
      });
      
      // Handle tag input fields - hide them when locked but keep tag badges visible
      // Filter out auth modal tag inputs
      const filteredTagInputs = Array.from(allTagInputs).filter(tagInput => {
        const authModal = document.getElementById('authModal');
        return !(authModal && authModal.contains(tagInput));
      });
      
      filteredTagInputs.forEach(tagInput => {
        const wrapper = tagInput.closest('.tag-input-wrapper');
        if (state.inputsLocked) {
          tagInput.style.display = 'none';
          if (wrapper) {
            wrapper.classList.add('locked');
          }
        } else {
          tagInput.style.display = '';
          if (wrapper) {
            wrapper.classList.remove('locked');
          }
        }
      });
      
      // Handle Paid EGP cells - add locked class to hide background
      const allPaidEgpCells = document.querySelectorAll('.paid-egp-cell.editable-value');
      allPaidEgpCells.forEach(cell => {
        if (state.inputsLocked) {
          cell.classList.add('locked');
        } else {
          cell.classList.remove('locked');
        }
      });
      
      // Handle method trigger arrows - hide when locked
      const allMethodTriggers = document.querySelectorAll('.method-trigger-minimal');
      allMethodTriggers.forEach(trigger => {
        if (state.inputsLocked) {
          trigger.classList.add('locked');
          // Hide the arrow icon specifically
          const arrowIcon = trigger.querySelector('svg, .arrow-icon');
          if (arrowIcon) {
            arrowIcon.style.display = 'none';
          }
        } else {
          trigger.classList.remove('locked');
          // Show the arrow icon again
          const arrowIcon = trigger.querySelector('svg, .arrow-icon');
          if (arrowIcon) {
            arrowIcon.style.display = '';
          }
        }
      });
      
      // Handle drag handles - make invisible with opacity 0 when locked
      const allDragHandles = document.querySelectorAll('.drag-handle');
      allDragHandles.forEach(handle => {
        if (state.inputsLocked) {
          handle.style.opacity = '0';
          handle.style.pointerEvents = 'none';
        } else {
          handle.style.opacity = '';
          handle.style.pointerEvents = '';
        }
      });
      
      // Show notification
      // Set context for user action
      smartNotifications.setContext({ 
        isUserAction: true, 
        lastActionTime: Date.now() 
      });
      
      if (state.inputsLocked) {
        showNotification('All inputs locked', 'warning', 2000, { force: true });
      } else {
        showNotification('All inputs unlocked', 'success', 2000, { force: true });
      }
    }
    
    // Function to ensure user settings exist with current state
    async function ensureUserSettingsExist() {
      if (!currentUser || !supabaseReady) return;
      
      try {
        // Check if user_settings record exists
        const { data: existingSettings, error: fetchError } = await window.supabaseClient
          .from('user_settings')
          .select('id, inputs_locked')
          .eq('user_id', currentUser.id)
          .single();
        
        // If no record exists or inputs_locked is null, create/update with current state
        if (fetchError && fetchError.code === 'PGRST116' || 
            (existingSettings && existingSettings.inputs_locked === null)) {
          
          await window.supabaseClient
            .from('user_settings')
            .upsert({
              user_id: currentUser.id,
              inputs_locked: state.inputsLocked,
              fx_rate: state.fx || 48.1843,
              theme: state.theme || 'dark',
              autosave: state.autosave === 'on',
              include_annual_in_monthly: state.includeAnnualInMonthly !== undefined ? state.includeAnnualInMonthly : true
            }, {
              onConflict: 'user_id'
            });
        }
      } catch (error) {
        // Silently handle user settings initialization errors
      }
    }

    // Function to save lock state to cloud
    async function saveLockStateToCloud() {
      if (!currentUser) return;
      
      try {
        // First, ensure user_settings record exists with current state
        await window.supabaseClient
          .from('user_settings')
          .upsert({
            user_id: currentUser.id,
            inputs_locked: state.inputsLocked,
            fx_rate: state.fx || 48.1843,
            theme: state.theme || 'dark',
            autosave: state.autosave === 'on',
            include_annual_in_monthly: state.includeAnnualInMonthly !== undefined ? state.includeAnnualInMonthly : true
          }, {
            onConflict: 'user_id'
          });
        

      } catch (error) {

        showNotification('Failed to sync lock state to cloud', 'error', 3000);
      }
    }

    // Enhanced live saving functionality
    let saveTimeout = null;
    let isSaving = false;
    let saveQueue = new Set(); // Track what needs saving
    let lastSaveTime = 0;
    const MIN_SAVE_INTERVAL = 100; // Reduced to 100ms for faster saves
    const MAX_DEBOUNCE_TIME = 500; // Reduced to 500ms for faster response

    function liveSave(source = 'unknown') {
      // Add to save queue
      saveQueue.add(source);
      
      // Skip if already saving
      if (isSaving) {
        return;
      }
      
      // Clear any existing timeout for better batching
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Use instant save for fast cloud sync
      const shouldSaveToCloud = currentUser && supabaseReady && !state.inputsLocked;
      
      if (shouldSaveToCloud) {
        // Use instant save for cloud with minimal delay for batching
        saveTimeout = setTimeout(() => {
          isSaving = true;
          updateSyncStatus('syncing');
          
          const saveStartTime = performance.now();
          console.log('🔄 Using instant save for:', source);
          
          instantSaveAll(source).then(() => {
            const saveDuration = performance.now() - saveStartTime;
            lastSaveTime = Date.now();
            updateSyncStatus('success');
            
            // Log performance for debugging
            if (saveDuration > 1000) {
              console.warn(`⚠️ Slow save detected: ${saveDuration.toFixed(2)}ms`);
            } else {
              console.log(`⚡ Fast save: ${saveDuration.toFixed(2)}ms`);
            }
            
            setTimeout(() => {
              updateSyncStatus('');
              isSaving = false;
              saveQueue.clear();
            }, 300); // Reduced delay
          }).catch((error) => {
            console.error('Save error:', error);
            updateSyncStatus('error');
            showNotification('Save failed', 'error', 1500);
            setTimeout(() => {
              updateSyncStatus('');
              isSaving = false;
              saveQueue.clear();
            }, 1500);
          });
        }, 50); // Very short delay for batching multiple changes
      } else {
        // Fallback to local save
        isSaving = true;
        updateSyncStatus('syncing');
        
        const fallbackStartTime = performance.now();
        saveToLocal();
        
        const fallbackDuration = performance.now() - fallbackStartTime;
        lastSaveTime = Date.now();
        updateSyncStatus('success');
        
        // Log performance for debugging
        console.log(`💾 Local save: ${fallbackDuration.toFixed(2)}ms`);
        
        setTimeout(() => {
          updateSyncStatus('');
          isSaving = false;
          saveQueue.clear();
        }, 300);
      }
    }
    
    // Instant save function for all inputs - 0ms delay
    let instantSaveInProgress = new Set();
    
    async function instantSaveAll(source = 'general') {
      console.log('⚡ instantSaveAll called:', { 
        source, 
        inputsLocked: state.inputsLocked, 
        hasUser: !!currentUser, 
        supabaseReady 
      });
      
      // Check if lock is active - if so, only save locally, not to cloud
      if (state.inputsLocked) {
        console.log('🔒 Inputs locked, saving locally only');
        saveToLocal();
        return;
      }
      
      if (!currentUser || !supabaseReady) {
        console.log('❌ No user or Supabase not ready, saving locally only');
        saveToLocal();
        return;
      }
      
      const saveKey = `instant-${source}-${Date.now()}`;
      
      // Prevent duplicate saves
      if (instantSaveInProgress.has(saveKey)) {
        console.log('⏳ Save already in progress, skipping');
        return;
      }
      
      instantSaveInProgress.add(saveKey);
      
      try {
        console.log('🔄 Starting cloud save...');
        updateSyncStatus('syncing');
        
        // Always use the regular saveToSupabase function for reliability
        await saveToSupabase();
        
        console.log('✅ Cloud save successful');
        updateSyncStatus('success');
        // Only show sync notifications for important operations
        // showNotification('Synced to cloud instantly', 'success', 1000);
        
        // Also save locally as backup
        saveToLocal();
        
      } catch (error) {
        console.error('❌ Cloud save failed:', error);
        updateSyncStatus('error');
        showNotification('Cloud sync failed', 'error', 2000);
        
        // Fallback to local save
        saveToLocal();
      } finally {
        // Remove from in-progress set
        instantSaveInProgress.delete(saveKey);
        setTimeout(() => {
          updateSyncStatus('');
        }, 1000);
      }
    }

    // Instant save function specifically for income data
    let incomeDebounceTimeouts = new Map();
    
    // Instant save function for expense financial inputs - 0ms delay
    let expenseSaveInProgress = new Set();
    
    async function instantSaveExpenseRow(expenseRow, isBiz) {
      console.log('💾 instantSaveExpenseRow called:', { 
        name: expenseRow.name, 
        cost: expenseRow.cost, 
        isBiz, 
        hasId: !!expenseRow.id,
        inputsLocked: state.inputsLocked,
        hasUser: !!currentUser,
        supabaseReady
      });
      
      // Check if lock is active - if so, only save locally, not to cloud
      if (state.inputsLocked) {
        console.log('🔒 Inputs locked, saving locally only');
        saveToLocal();
        return;
      }
      
      if (!currentUser || !supabaseReady) {
        console.log('❌ No user or Supabase not ready, saving locally only');
        saveToLocal();
        return;
      }
      
      const tableName = isBiz ? 'business_expenses' : 'personal_expenses';
      const rowKey = `${tableName}-${expenseRow.id || 'new'}`;
      
      // Prevent duplicate saves for the same row
      if (expenseSaveInProgress.has(rowKey)) {
        return;
      }
      
      expenseSaveInProgress.add(rowKey);
      
      try {
        if (expenseRow.id) {
          // Update existing row - 0ms delay
          const { error } = await window.supabaseClient
            .from(tableName)
            .update({
              name: expenseRow.name,
              cost: expenseRow.cost,
              status: expenseRow.status,
              billing: expenseRow.billing,
              next_payment: expenseRow.next ? new Date(expenseRow.next).toISOString().split('T')[0] : null,
              monthly_usd: expenseRow.monthlyUSD || 0,
              yearly_usd: expenseRow.yearlyUSD || 0,
              monthly_egp: expenseRow.monthlyEGP || 0,
              yearly_egp: expenseRow.yearlyEGP || 0,
              icon: expenseRow.icon
            })
            .eq('id', expenseRow.id);
            
          if (error) throw error;

        } else {
          // Create new row - 0ms delay
          const { data, error } = await window.supabaseClient
            .from(tableName)
            .insert({
              name: expenseRow.name,
              cost: expenseRow.cost,
              status: expenseRow.status,
              billing: expenseRow.billing,
              next_payment: expenseRow.next ? new Date(expenseRow.next).toISOString().split('T')[0] : null,
              monthly_usd: expenseRow.monthlyUSD || 0,
              yearly_usd: expenseRow.yearlyUSD || 0,
              monthly_egp: expenseRow.monthlyEGP || 0,
              yearly_egp: expenseRow.yearlyEGP || 0,
              icon: expenseRow.icon
            })
            .select()
            .single();
            
          if (error) throw error;
          
          // Update the local row with the new ID
          expenseRow.id = data.id;

        }
        
        // Also save locally as backup
        saveToLocal();
        
      } catch (error) {

        // Fallback to local save
        saveToLocal();
      } finally {
        // Remove from in-progress set
        expenseSaveInProgress.delete(rowKey);
      }
    }
    
    async function instantSaveIncomeRow(incomeRow, year) {
      // Check if lock is active - if so, only save locally, not to cloud
      if (state.inputsLocked) {

        saveToLocal();
        return;
      }
      
      if (!currentUser || !supabaseReady) {

        saveToLocal();
        return;
      }
      
      // Create a unique key for this income row to prevent duplicate saves
      const rowKey = incomeRow.id || `temp_${incomeRow.name}_${incomeRow.date}`;
      
      // Prevent duplicate saves for the same row
      if (incomeSaveInProgress && incomeSaveInProgress.has(rowKey)) {
        return;
      }
      
      // Initialize the set if it doesn't exist
      if (!incomeSaveInProgress) {
        incomeSaveInProgress = new Set();
      }
      
      incomeSaveInProgress.add(rowKey);
      
      // Save immediately - 0ms delay
        try {
          
          if (incomeRow.id) {
            // Update existing income record
            // Try to update with paid_egp first, fallback if field doesn't exist
            let updateError;
            try {
              const { error } = await window.supabaseClient
              .from('income')
              .update({
                name: incomeRow.name || '',
                tags: incomeRow.tags || '',
                date: incomeRow.date || new Date().toISOString().split('T')[0],
                all_payment: incomeRow.allPayment || 0,
                paid_usd: incomeRow.paidUsd || 0,
                  paid_egp: incomeRow.paidEgp || null,
                method: incomeRow.method || 'Bank Transfer',
                icon: incomeRow.icon || 'fa:dollar-sign',
                year: parseInt(year),
                order: incomeRow.order || 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', incomeRow.id);
              updateError = error;
            } catch (schemaError) {
              // If paid_egp field doesn't exist, fallback to without it

              const { error } = await window.supabaseClient
                .from('income')
                .update({
                  name: incomeRow.name || '',
                  tags: incomeRow.tags || '',
                  date: incomeRow.date || new Date().toISOString().split('T')[0],
                  all_payment: incomeRow.allPayment || 0,
                  paid_usd: incomeRow.paidUsd || 0,
                  method: incomeRow.method || 'Bank Transfer',
                  icon: incomeRow.icon || 'fa:dollar-sign',
                  year: parseInt(year),
                  order: incomeRow.order || 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', incomeRow.id);
              updateError = error;
            }
            
            if (updateError) {

              showNotification('Failed to save changes, retrying...', 'error', 2000);
              
              // Retry once after a short delay
              setTimeout(async () => {
                try {
                  const { error: retryError } = await window.supabaseClient
                    .from('income')
                    .update({
                      tags: incomeRow.tags || '',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', incomeRow.id);
                  
                  if (retryError) {
                    showNotification('Failed to sync tags', 'error', 3000);
                  } else {
                    // Don't show individual tag sync notifications
              // showNotification('Tags synced', 'success', 1000);
                  }
                } catch (retryErr) {
                  // Silent retry error
                }
              }, 1000);
              
              throw updateError;
            } else {
              // Don't show individual tag update notifications
              // showNotification('Tags updated', 'success', 800);
            }
          } else {
            // Create new income record
            const { data: newIncome, error: insertError } = await window.supabaseClient
              .from('income')
              .insert({
                user_id: currentUser.id,
                name: incomeRow.name || '',
                tags: incomeRow.tags || '',
                date: incomeRow.date || new Date().toISOString().split('T')[0],
                all_payment: incomeRow.allPayment || 0,
                paid_usd: incomeRow.paidUsd || 0,
                paid_egp: incomeRow.paidEgp || null,
                method: incomeRow.method || 'Bank Transfer',
                icon: incomeRow.icon || 'fa:dollar-sign',
                year: parseInt(year),
                order: incomeRow.order || 0
              })
              .select()
              .single();
            
            if (insertError) {

              showNotification('Failed to save income', 'error', 2000);
              throw insertError;
            } else {

              // Update the local row with the new ID
              if (newIncome) {
                incomeRow.id = newIncome.id;
              }
              // Don't show individual income save notifications
              // showNotification('Income saved', 'success', 800);
            }
          }
          
          // Also save to local storage as backup
          saveToLocal();
          
        } catch (error) {

          showNotification('Failed to save income', 'error', 2000);
          // Fallback to local save
          saveToLocal();
        } finally {
          // Remove from in-progress set
          incomeSaveInProgress.delete(rowKey);
          // Trigger live KPI updates after saving income data
          updateIncomeKPIsLive();
        }
    }

    // Direct save function for tag removal (no debouncing)
    async function saveIncomeRowDirectly(incomeRow, year) {
      // Check if lock is active - if so, only save locally, not to cloud
      if (state.inputsLocked) {

        saveToLocal();
        return;
      }
      
      if (!currentUser || !supabaseReady) {
        saveToLocal();
        return;
      }
      
      try {
        
        if (incomeRow.id) {
          // Update existing income record directly
          // Try to update with paid_egp first, fallback to tags only if it fails
          let updateError;
          try {
            const { error } = await window.supabaseClient
              .from('income')
              .update({
                tags: incomeRow.tags || '',
                paid_egp: incomeRow.paidEgp || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', incomeRow.id);
            updateError = error;
          } catch (schemaError) {
            // If paid_egp field doesn't exist, fallback to tags only

            const { error } = await window.supabaseClient
              .from('income')
              .update({
                tags: incomeRow.tags || '',
                updated_at: new Date().toISOString()
              })
              .eq('id', incomeRow.id);
            updateError = error;
          }
          
          if (updateError) {
            showNotification('Failed to save changes', 'error', 2000);
            throw updateError;
          } else {
            // Don't show individual change sync notifications
            // showNotification('Changes synced', 'success', 800);
          }
        } else {
          instantSaveIncomeRow(incomeRow, year);
        }
      } catch (error) {

        showNotification(`Failed to sync changes: ${error.message}`, 'error', 3000);
      }
    }

    // Sequential save function for imported income data
    async function saveImportedIncomeSequentially(importedIncomeData) {
      if (!currentUser || !supabaseReady) {
        return;
      }

      let totalRows = 0;
      let savedRows = 0;
      let errorRows = 0;

      // Count total rows to save
      for (const [year, yearData] of Object.entries(importedIncomeData)) {
        totalRows += yearData.length;
      }

      if (totalRows === 0) {
        return;
      }

      // Set context for bulk operation
      smartNotifications.setContext({ isBulkOperation: true });
      showNotification(`Importing ${totalRows} income rows...`, 'info', 2000, { force: true });

      try {
        // Process each year sequentially
        for (const [year, yearData] of Object.entries(importedIncomeData)) {
          const rowsToSave = yearData || [];
          
          if (rowsToSave.length === 0) continue;

          // Process each row in the year sequentially
          for (let i = 0; i < rowsToSave.length; i++) {
            const incomeRow = rowsToSave[i];
            
            // Find the corresponding row in state.income to update with the new ID
            const stateRowIndex = (state.income[year] || []).findIndex(stateRow => 
              stateRow.name === incomeRow.name && 
              stateRow.date === incomeRow.date &&
              stateRow.allPayment === incomeRow.allPayment &&
              !stateRow.id
            );
            
            try {
              // Use direct Supabase call instead of instantSaveIncomeRow to avoid debouncing
              const { data: newIncome, error: insertError } = await window.supabaseClient
                .from('income')
                .insert({
                  user_id: currentUser.id,
                  name: incomeRow.name || '',
                  tags: incomeRow.tags || '',
                  date: incomeRow.date || new Date().toISOString().split('T')[0],
                  all_payment: incomeRow.allPayment || 0,
                  paid_usd: incomeRow.paidUsd || 0,
                  paid_egp: incomeRow.paidEgp || null,
                  method: incomeRow.method || 'Bank Transfer',
                  icon: incomeRow.icon || 'fa:dollar-sign',
                  year: parseInt(year)
                })
                .select()
                .single();

              if (insertError) {
                errorRows++;
              } else {
                // Update the corresponding row in state.income with the new ID
                if (stateRowIndex >= 0) {
                  state.income[year][stateRowIndex].id = newIncome.id;
                }
                savedRows++;
              }

              // Small delay between saves to avoid overwhelming the API
              if (i < rowsToSave.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }

            } catch (error) {
              errorRows++;
            }
          }

          // Delay between years
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Show final result
        // Clear bulk operation context
        smartNotifications.setContext({ isBulkOperation: false });
        
        if (errorRows === 0) {
          showNotification(`✅ Imported ${savedRows} income rows successfully!`, 'success', 3000, { force: true });
        } else {
          showNotification(`⚠️ Imported ${savedRows}/${totalRows} rows (${errorRows} failed)`, 'warning', 4000, { force: true });
        }

        // Save to local storage as backup
        saveToLocal();

      } catch (error) {
        showNotification('Failed to save imported income data', 'error', 3000);
      }
    }

    // Helper function to find and save any income rows without IDs
    async function saveAllRowsWithoutIds() {
      if (!currentUser || !supabaseReady) {
        showNotification('Please sign in first to save to cloud', 'error', 3000);
        return;
      }

      const rowsWithoutIds = {};
      let totalCount = 0;

      // Find all rows without IDs
      for (const [year, yearData] of Object.entries(state.income || {})) {
        const rowsInYear = yearData.filter(row => !row.id);
        if (rowsInYear.length > 0) {
          rowsWithoutIds[year] = rowsInYear;
          totalCount += rowsInYear.length;
        }
      }

      if (totalCount === 0) {
        showNotification('All income rows already have IDs', 'info', 2000);
        return;
      }

      showNotification(`Found ${totalCount} rows to save. Starting save process...`, 'info', 2000);

      // Create cleaned data (remove any lingering IDs)
      const cleanedData = {};
      Object.keys(rowsWithoutIds).forEach(year => {
        cleanedData[year] = rowsWithoutIds[year].map(row => {
          const cleanRow = { ...row };
          delete cleanRow.id;
          return cleanRow;
        });
      });

      // Use the sequential save function
      await saveImportedIncomeSequentially(cleanedData);
    }

    function refreshData() {
      const refreshIcon = document.getElementById('iconRefresh');
      const syncStatus = document.getElementById('syncStatus');
      const originalTransform = refreshIcon.style.transform;
      
      // Update sync status
      updateSyncStatus('syncing');
      
      // Add spinning animation
      refreshIcon.style.transform = 'rotate(360deg)';
      refreshIcon.style.transition = 'transform 0.5s ease';
      
      // Only load fresh data from cloud - no saving
      if (currentUser && supabaseReady) {
        loadUserData().then(() => {
          updateSyncStatus('success');
          showNotification('🔄 Data synced from cloud', 'success', 2000, { force: true });
          resetRefreshIcon();
        }).catch((error) => {
          updateSyncStatus('error');
          showNotification('Cloud sync failed', 'error', 2000);
          resetRefreshIcon();
        });
      } else {
        updateSyncStatus('offline');
        showNotification('Not connected to cloud', 'info', 2000);
        resetRefreshIcon();
      }
      
      function resetRefreshIcon() {
        setTimeout(() => {
          refreshIcon.style.transform = originalTransform;
          // Keep success status for 2 seconds, then hide
          if (syncStatus.classList.contains('success')) {
            setTimeout(() => {
              updateSyncStatus('');
            }, 2000);
          }
        }, 500);
      }
    }
    
    function updateSyncStatus(status) {
      const syncStatus = document.getElementById('syncStatus');
      if (!syncStatus) return;
      
      // Remove all status classes
      syncStatus.classList.remove('syncing', 'success', 'error', 'offline');
      
      // Add new status class
      if (status) {
        syncStatus.classList.add(status);
      }
    }
    
    async function syncWithCloud() {
      try {
        // First, save current data to cloud
        await saveToSupabase();
        
        // Then, load fresh data from cloud
        await loadUserData();
        
        // Verify sync was successful
        if (currentUser && supabaseReady) {

          return true;
        } else {
          throw new Error('Sync verification failed');
        }
      } catch (error) {

        throw error;
      }
    }

    // Live saving is always enabled - no need for auto-refresh intervals
    
    // Check connection status and update sync indicator
    function checkConnectionStatus() {
      const syncStatus = document.getElementById('syncStatus');
      if (!syncStatus) return;
      
      if (navigator.onLine) {
        if (currentUser && supabaseReady) {
          updateSyncStatus('success');
        } else {
          updateSyncStatus('offline');
        }
      } else {
        updateSyncStatus('error');
      }
    }
    
    // Monitor connection status
    window.addEventListener('online', () => {
      checkConnectionStatus();
      showNotification('Connection restored', 'success', 2000);
    });
    
    window.addEventListener('offline', () => {
      updateSyncStatus('error');
      showNotification('Connection lost - using offline mode', 'warning', 3000);
    });
    
    // Initial connection check
    checkConnectionStatus();

    // Manual refresh button
    $('#btnRefresh').addEventListener('click', refreshData);
    
    // Currency dropdown functionality
    const currencyBtn = document.getElementById('btnCurrency');
    const currencyDropdown = document.getElementById('currencyDropdown');
    
    currencyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currencyDropdown.style.display = currencyDropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!currencyBtn.contains(e.target) && !currencyDropdown.contains(e.target)) {
        currencyDropdown.style.display = 'none';
      }
    });
    
    // Currency option selection
    document.querySelectorAll('.currency-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const currency = option.dataset.currency;
        const symbol = option.dataset.symbol;
        const rate = parseFloat(option.dataset.rate);
        
        updateCurrency(currency);
        currencyDropdown.style.display = 'none';
        
        // Save to localStorage
        localStorage.setItem('selectedCurrency', currency);
      });
    });
    
    // Load saved currency on startup (moved after function definitions)

    // Numbers
    const nfUSD = new Intl.NumberFormat('en-US',{style:'currency', currency:'USD', maximumFractionDigits:0});
    const nfINT = new Intl.NumberFormat('en-US');
    const usdToEgp = (usd)=> usd * Number(state.fx || 0);
    
    // Currency conversion system - rates from USD to each currency
    const currencyRates = {
      'EGP': 48.1843,  // 1 USD = 48.18 EGP
      'KWD': 0.31,     // 1 USD = 0.31 KWD
      'SAR': 3.75,     // 1 USD = 3.75 SAR
      'AED': 3.67,     // 1 USD = 3.67 AED
      'QAR': 3.64,     // 1 USD = 3.64 QAR
      'BHD': 0.38,     // 1 USD = 0.38 BHD
      'EUR': 0.92      // 1 USD = 0.92 EUR
    };
    
    const currencySymbols = {
      'EGP': 'EGP',
      'KWD': 'KWD',
      'SAR': 'SAR',
      'AED': 'AED',
      'QAR': 'QAR',
      'BHD': 'BHD',
      'EUR': '€'
    };
    
    // Convert USD to selected currency
    const usdToSelectedCurrency = (usd) => {
      if (!usd || isNaN(usd)) return 0;
      const rate = currencyRates[state.selectedCurrency] || currencyRates['EGP'] || 48.1843;
      const result = usd * rate;
      if (isNaN(result)) {
        console.warn('Currency conversion failed:', { usd, selectedCurrency: state.selectedCurrency, rate, result });
        return 0;
      }
      return result;
    };
    
    // Format currency with selected currency symbol
    const formatCurrency = (amount, currency = state.selectedCurrency) => {
      if (!amount || isNaN(amount)) return `${currencySymbols[currency] || currency} 0`;
      const symbol = currencySymbols[currency] || currency;
      const formatted = nfINT.format(Math.round(amount));
      return `${symbol} ${formatted}`;
    };
    
    // Initialize currency system
    const initializeCurrencySystem = () => {
      try {
        const savedCurrency = localStorage.getItem('selectedCurrency');
        if (savedCurrency && currencyRates && currencyRates[savedCurrency]) {
          state.selectedCurrency = savedCurrency;
          state.currencySymbol = currencySymbols[savedCurrency] || savedCurrency;
          state.currencyRate = currencyRates[savedCurrency];
          updateCurrency(savedCurrency);
        } else {
          // Initialize with default EGP
          state.selectedCurrency = 'EGP';
          state.currencySymbol = 'EGP';
          state.currencyRate = 48.1843;
          updateCurrency('EGP');
        }
        console.log('Currency system initialized:', { 
          selectedCurrency: state.selectedCurrency, 
          currencySymbol: state.currencySymbol, 
          currencyRate: state.currencyRate 
        });
      } catch (error) {
        console.warn('Currency initialization failed:', error);
        // Fallback to EGP
        state.selectedCurrency = 'EGP';
        state.currencySymbol = 'EGP';
        state.currencyRate = 48.1843;
      }
    };

    // Update currency conversion
    const updateCurrency = (currency) => {
      state.selectedCurrency = currency;
      state.currencySymbol = currencySymbols[currency] || currency;
      // Always update currencyRate to the current rate for the selected currency
      // This ensures the FX display shows the correct rate
      state.currencyRate = currencyRates[currency] || 1;
      
      // Update UI
      document.getElementById('currencySymbol').textContent = state.currencySymbol;
      
      // Update page title
      const titleCurrencyEl = document.getElementById('titleCurrency');
      if (titleCurrencyEl) {
        titleCurrencyEl.textContent = state.currencySymbol;
      }
      
      // Update table headers
      const currencyText = state.currencySymbol;
      setText('headerMonthlyEGP', `Monthly ${currencyText}`);
      setText('headerYearlyEGP', `Yearly ${currencyText}`);
      setText('headerBizMonthlyEGP', `Monthly ${currencyText}`);
      setText('headerBizYearlyEGP', `Yearly ${currencyText}`);
      setText('headerPaidEGP', `Paid ${currencyText}`);
      
      // Update settings label
      setText('fxRateLabel', `USD → ${currencyText} Rate`);
      
      // Update FX labels in KPI cards
      setText('kpiFxLabel', `FX (USD→${currencyText})`);
      setText('kpiIncomeFxLabel', `FX (USD→${currencyText})`);
      
      // Update FX rate based on selected currency
      // Use the direct rate from USD to selected currency
      const newFxRate = state.currencyRate;
      const fxInput = document.getElementById('inputFx');
      if (fxInput) {
        fxInput.value = newFxRate.toFixed(4);
      }
      
      // Update state.fx to match currencyRate for backward compatibility
      state.fx = state.currencyRate;
      
      // Update all KPI displays with new currency
      updateAllKPIDisplays();
      
      // Recalculate and update all displays
      renderKPIs();
      renderTables();
      updateAnalyticsPage();
    };
    
    // Function to update all KPI displays with current currency
    function updateAllKPIDisplays() {
      // Update FX rate displays in KPI cards
      setText('kpiFxSmall', Number(state.currencyRate || 0).toFixed(4));
      setText('kpiIncomeFxSmall', Number(state.currencyRate || 0).toFixed(4));
      
      // Update all financial calculations with new rate
      updateAllCalculationsWithoutRerender();
      
      // Update income KPIs if on income page
      if (typeof updateIncomeKPIsLive === 'function') {
        updateIncomeKPIsLive();
      }
    }
    
    // Function to render all tables
    function renderTables() {
      renderList('list-personal', state.personal, false);
      renderList('list-biz', state.biz, true);
      const currentYearData = state.income[currentYear] || [];
      renderIncomeList('list-income', currentYearData);
    };
    
    const rowMonthlyUSD = (r)=> {
      if (r.status !== 'Active') return 0;
      if (r.billing === 'Monthly') return Number(r.cost||0);
      if (r.billing === 'Annually') {
        return state.includeAnnualInMonthly ? Number(r.cost||0)/12 : 0;
      }
      return 0;
    };
    const rowYearlyUSD  = (r)=> r.status==='Active' ? (r.billing==='Monthly' ? Number(r.cost||0)*12 : Number(r.cost||0)) : 0;
    function totals(arr){ 
      const mUSD=arr.reduce((s,r)=>s+rowMonthlyUSD(r),0); 
      const yUSD=arr.reduce((s,r)=>s+rowYearlyUSD(r),0); 
      return { 
        mUSD, 
        yUSD, 
        mEGP: usdToEgp(mUSD), 
        yEGP: usdToEgp(yUSD),
        mSelected: usdToSelectedCurrency(mUSD),
        ySelected: usdToSelectedCurrency(yUSD)
      }; 
    }
    
    // Income calculation functions
    // For income, each entry is a single payment, not a recurring amount
    const rowIncomeMonthlyUSD = (r) => {
      // Income entries are individual payments, so monthly = 0 unless it's this month
      const paymentDate = new Date(r.date);
      const now = new Date();
      const isThisMonth = paymentDate.getFullYear() === now.getFullYear() && 
                         paymentDate.getMonth() === now.getMonth();
      return isThisMonth ? Number(r.paidUsd || 0) : 0;
    };
    const rowIncomeYearlyUSD = (r) => {
      // Income entries are individual payments, so yearly = 0 unless it's this year
      const paymentDate = new Date(r.date);
      const now = new Date();
      const isThisYear = paymentDate.getFullYear() === now.getFullYear();
      return isThisYear ? Number(r.paidUsd || 0) : 0;
    };
    
    // Calculate lifetime income totals across all years
    function lifetimeIncomeTotals() {
      let totalUSD = 0;
      let totalEGP = 0;
      let totalSelected = 0;
      let totalEntries = 0;
      let earliestDate = null;
      let latestDate = null;
      
      // Sum up income from all years and find date range
      Object.keys(state.income).forEach(year => {
        const yearData = state.income[year] || [];
        yearData.forEach(r => {
          const usdAmount = Number(r.paidUsd || 0);
          totalUSD += usdAmount;
          totalEGP += usdAmount * Number(state.fx || 0); // Calculate EGP from USD
          totalSelected += usdToSelectedCurrency(usdAmount); // Calculate selected currency
          totalEntries++;
          
          // Track date range for accurate time calculations
          if (r.date) {
            const entryDate = new Date(r.date);
            if (!earliestDate || entryDate < earliestDate) {
              earliestDate = entryDate;
            }
            if (!latestDate || entryDate > latestDate) {
              latestDate = entryDate;
            }
          }
        });
      });
      
      // Calculate time span in different units
      const now = new Date();
      const startDate = earliestDate || now;
      const endDate = latestDate || now;
      
      // Calculate actual time span (not just current year)
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
      const totalHours = totalDays * 24;
      const totalMinutes = totalHours * 60;
      const totalSeconds = totalMinutes * 60;
      
      // Calculate years span
      const yearsSpan = Math.max(1, endDate.getFullYear() - startDate.getFullYear() + 1);
      const monthsSpan = Math.max(1, yearsSpan * 12);
      
      return {
        // Totals
        totalUSD,
        totalEGP,
        totalSelected,
        totalEntries,
        
        // Time-based calculations (based on actual earning period)
        yearlyUSD: totalUSD / yearsSpan,
        monthlyUSD: totalUSD / monthsSpan,
        dailyUSD: totalUSD / totalDays,
        hourlyUSD: totalUSD / totalHours,
        minutelyUSD: totalUSD / totalMinutes,
        secondlyUSD: totalUSD / totalSeconds,
        
        // EGP equivalents
        yearlyEGP: totalEGP / yearsSpan,
        monthlyEGP: totalEGP / monthsSpan,
        dailyEGP: totalEGP / totalDays,
        hourlyEGP: totalEGP / totalHours,
        minutelyEGP: totalEGP / totalMinutes,
        secondlyEGP: totalEGP / totalSeconds,
        
        // Selected currency equivalents
        yearlySelected: totalSelected / yearsSpan,
        monthlySelected: totalSelected / monthsSpan,
        dailySelected: totalSelected / totalDays,
        hourlySelected: totalSelected / totalHours,
        minutelySelected: totalSelected / totalMinutes,
        secondlySelected: totalSelected / totalSeconds,
        
        // Additional info
        yearsSpan,
        monthsSpan,
        totalDays,
        startDate,
        endDate
      };
    }
    
    function incomeTotals(arr) { 
      const mUSD = arr.reduce((s, r) => s + rowIncomeMonthlyUSD(r), 0); 
      const yUSD = arr.reduce((s, r) => s + rowIncomeYearlyUSD(r), 0); 
      return { 
        mUSD, 
        yUSD, 
        mEGP: usdToEgp(mUSD), 
        yEGP: usdToEgp(yUSD),
        mSelected: usdToSelectedCurrency(mUSD),
        ySelected: usdToSelectedCurrency(yUSD)
      }; 
    }

    // Enhanced setText function with value comparison to prevent unnecessary updates
    function setText(id, val) { 
      const el = document.getElementById(id); 
      if (el) {
        // Only update if the value has actually changed
        if (el.textContent !== val) {
          el.textContent = val;
        }
      }
    }

    // Custom method options management
    function getCustomMethodOptions() {
      const saved = localStorage.getItem('customMethodOptions');
      return saved ? JSON.parse(saved) : [];
    }
    
    function saveCustomMethodOptions(options) {
      localStorage.setItem('customMethodOptions', JSON.stringify(options));
    }
    
    function addCustomMethodOption(option) {
      if (!option || option.trim() === '') return;
      const customOptions = getCustomMethodOptions();
      const trimmedOption = option.trim();
      if (!customOptions.includes(trimmedOption)) {
        customOptions.push(trimmedOption);
        saveCustomMethodOptions(customOptions);
      }
    }
    
    function removeCustomMethodOption(option) {
      const customOptions = getCustomMethodOptions();
      const filtered = customOptions.filter(opt => opt !== option);
      saveCustomMethodOptions(filtered);
    }
    
    function getAllMethodOptions() {
      const defaultOptions = ['Bank Transfer', 'Paypal', 'Cash', 'Crypto', 'InstaPay', 'Wire Transfer'];
      const customOptions = getCustomMethodOptions();
      return [...defaultOptions, ...customOptions];
    }
    
    // Helper function to format date for display (Month Day format)
    function formatDateForDisplay(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    
    // Helper function to check if date is in the future
    function isFutureDate(dateString) {
      if (!dateString) return false;
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      return date >= today;
    }


  // Cache for KPI values to prevent unnecessary updates
  let lastKPIValues = {};
  let renderKPIsTimeout = null;
  
  // Deep equality check for KPI values
  function isEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!isEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
  
  function renderKPIs(forceUpdate = false){
    // If force update is requested, skip debouncing
    if (forceUpdate) {
      renderKPIsImmediate();
      return;
    }
    
    // Debounce rapid successive calls
    if (renderKPIsTimeout) {
      clearTimeout(renderKPIsTimeout);
    }
    
    renderKPIsTimeout = setTimeout(() => {
      renderKPIsImmediate();
    }, 10); // Small delay to batch updates
  }
  
  function renderKPIsImmediate(){
    // Calculate all values first
    const p = totals(state.personal); 
    const b = totals(state.biz);
    const currentYearData = state.income[currentYear] || [];
    const i = incomeTotals(currentYearData);
    const all = { mUSD:p.mUSD + b.mUSD, yUSD:p.yUSD + b.yUSD };
    all.mEGP = usdToEgp(all.mUSD); 
    all.yEGP = usdToEgp(all.yUSD);
    all.mSelected = usdToSelectedCurrency(all.mUSD);
    all.ySelected = usdToSelectedCurrency(all.yUSD);
    const lifetimeIncome = lifetimeIncomeTotals();
    
    // Create current values object for comparison
    const currentValues = {
      allMonthlyUSD: all.mUSD,
      allYearlyUSD: all.yUSD,
      allMonthlySelected: all.mSelected,
      allYearlySelected: all.ySelected,
      personalMonthly: p.mUSD,
      personalYearly: p.yUSD,
      personalMonthlySelected: p.mSelected,
      personalYearlySelected: p.ySelected,
      bizMonthly: b.mUSD,
      bizYearly: b.yUSD,
      bizMonthlySelected: b.mSelected,
      bizYearlySelected: b.ySelected,
      fx: state.fx,
      currencyRate: state.currencyRate,
      selectedCurrency: state.selectedCurrency,
      incomeMonthly: i.mUSD,
      incomeYearly: i.yUSD,
      incomeMonthlySelected: i.mSelected,
      incomeYearlySelected: i.ySelected,
      lifetimeMonthly: lifetimeIncome.monthlyUSD,
      lifetimeYearly: lifetimeIncome.yearlyUSD,
      lifetimeMonthlySelected: lifetimeIncome.monthlySelected,
      lifetimeYearlySelected: lifetimeIncome.yearlySelected
    };
    
    // Only update if values have actually changed (more precise comparison)
    const hasChanged = !isEqual(currentValues, lastKPIValues);
    if (!hasChanged) return;
    
    // Update last values
    lastKPIValues = { ...currentValues };
    
    // Update All KPIs
    setText('kpiAllMonthlyUSD', nfUSD.format(all.mUSD));
    setText('kpiAllMonthlyEGP', formatCurrency(all.mSelected));
    setText('kpiAllYearlyUSD', nfUSD.format(all.yUSD));
    setText('kpiAllYearlyEGP', formatCurrency(all.ySelected));
    setText('kpiFxSmall', Number(state.currencyRate||0).toFixed(4));
    
    // Update Personal KPIs
    setText('kpiPersonalMonthly', nfUSD.format(p.mUSD));
    setText('kpiPersonalMonthlyEGP', formatCurrency(p.mSelected));
    setText('kpiPersonalYearly', nfUSD.format(p.yUSD));
    setText('kpiPersonalYearlyEGP', formatCurrency(p.ySelected));
    
    // Update Business KPIs
    setText('kpiBizMonthly', nfUSD.format(b.mUSD));
    setText('kpiBizMonthlyEGP', formatCurrency(b.mSelected));
    setText('kpiBizYearly', nfUSD.format(b.yUSD));
    setText('kpiBizYearlyEGP', formatCurrency(b.ySelected));
    
    // Update percentage bars
    const total = all.mUSD; 
    const sp = total > 0 ? Math.round((p.mUSD/total)*100) : 0; 
    const sb = total > 0 ? Math.round((b.mUSD/total)*100) : 0;
    setText('sharePersonalVal', sp + '%'); 
    setText('shareBizVal', sb + '%');
    
    // Update bar widths only if they've changed
    const ps = document.getElementById('sharePersonalBar');
    const bs = document.getElementById('shareBizBar');
    if (ps && ps.style.width !== sp + '%') ps.style.width = sp + '%';
    if (bs && bs.style.width !== sb + '%') bs.style.width = sb + '%';
    
    // Update Income KPIs with lifetime totals
    setText('kpiIncomeAllMonthlyUSD', nfUSD.format(lifetimeIncome.monthlyUSD));
    setText('kpiIncomeAllMonthlyEGP', formatCurrency(lifetimeIncome.monthlySelected));
    setText('kpiIncomeAllYearlyUSD', nfUSD.format(lifetimeIncome.yearlyUSD));
    setText('kpiIncomeAllYearlyEGP', formatCurrency(lifetimeIncome.yearlySelected));
    setText('kpiIncomeFxSmall', Number(state.currencyRate||0).toFixed(4));
    setText('kpiIncomeMonthlyCurrent', nfUSD.format(i.mUSD));
    setText('kpiIncomeMonthlyCurrentEGP', formatCurrency(i.mSelected));
    setText('kpiIncomeMonthlyAvg', nfUSD.format(lifetimeIncome.monthlyUSD));
    setText('kpiIncomeMonthlyAvgEGP', formatCurrency(lifetimeIncome.monthlySelected));
    setText('kpiIncomeYearlyCurrent', nfUSD.format(i.yUSD));
    setText('kpiIncomeYearlyCurrentEGP', formatCurrency(i.ySelected));
    setText('kpiIncomeYearlyTarget', nfUSD.format(lifetimeIncome.yearlyUSD * 1.2));
    setText('kpiIncomeYearlyTargetEGP', formatCurrency(lifetimeIncome.yearlySelected * 1.2));
    
    // Update lifetime income breakdown
    setText('shareIncomeCompletedVal', nfUSD.format(lifetimeIncome.totalUSD));
    setText('shareIncomePendingVal', lifetimeIncome.totalEntries.toString());
    
    // Update analytics content (only when values change)
    updateAnalytics();
    updateIncomeAnalytics();
  }
    
    // Income Analytics function
    function updateIncomeAnalytics() {
      const currentYearData = state.income[currentYear] || [];
      const income = incomeTotals(currentYearData);
      updateIncomeAllAnalytics(income);
      updateIncomeMonthlyAnalytics(income);
      updateIncomeYearlyAnalytics(income);
    }
    
    function updateIncomeAllAnalytics(income) {
      const container = document.getElementById('analyticsIncomeAll');
      if (!container) return;

      const lifetimeIncome = lifetimeIncomeTotals();
      
      // Get all income data across all years
      let allIncomeEntries = [];
      Object.keys(state.income).forEach(year => {
        const yearData = state.income[year] || [];
        allIncomeEntries = allIncomeEntries.concat(yearData);
      });
      
      const totalItems = allIncomeEntries.length;
      const avgIncomePerEntry = totalItems > 0 ? lifetimeIncome.totalUSD / totalItems : 0;
      
      // Find highest and lowest income entries
      const sortedByCost = allIncomeEntries.sort((a, b) => {
        return Number(b.paidUsd || 0) - Number(a.paidUsd || 0);
      });
      
      const highestIncome = sortedByCost[0];
      const lowestIncome = sortedByCost[sortedByCost.length - 1];
      
      // Calculate year distribution
      const yearDistribution = {};
      Object.keys(state.income).forEach(year => {
        const yearData = state.income[year] || [];
        const yearTotal = yearData.reduce((sum, r) => sum + Number(r.paidUsd || 0), 0);
        if (yearTotal > 0) {
          yearDistribution[year] = yearTotal;
        }
      });
      
      const bestYear = Object.keys(yearDistribution).reduce((a, b) => 
        yearDistribution[a] > yearDistribution[b] ? a : b, Object.keys(yearDistribution)[0]);
      const bestYearAmount = yearDistribution[bestYear] || 0;

      // Get income insights once
      const incomeInsights = generateIncomeInsights();

      container.innerHTML = `
        <div class="analytics-section">
          <div class="section-title">🏆 Lifetime Income Overview</div>
          <div class="analytics-grid-4">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.totalUSD)}</div>
              <div class="metric-label">Total Lifetime</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${totalItems}</div>
              <div class="metric-label">Total Entries</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(avgIncomePerEntry)}</div>
              <div class="metric-label">Avg Per Entry</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${Object.keys(yearDistribution).length}</div>
              <div class="metric-label">Active Years</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">⏰ Complete Time Breakdown</div>
          <div class="analytics-grid-3">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.yearlyUSD)}</div>
              <div class="metric-label">Per Year</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.monthlyUSD)}</div>
              <div class="metric-label">Per Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.dailyUSD)}</div>
              <div class="metric-label">Per Day</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.hourlyUSD)}</div>
              <div class="metric-label">Per Hour</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.minutelyUSD)}</div>
              <div class="metric-label">Per Minute</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.secondlyUSD)}</div>
              <div class="metric-label">Per Second</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">💰 ${state.currencySymbol} Breakdown</div>
          <div class="analytics-grid-3">
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.totalSelected)}</div>
              <div class="metric-label">Total Lifetime</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.monthlySelected)}</div>
              <div class="metric-label">Per Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.dailySelected)}</div>
              <div class="metric-label">Per Day</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.hourlySelected)}</div>
              <div class="metric-label">Per Hour</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.minutelySelected)}</div>
              <div class="metric-label">Per Minute</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.secondlySelected)}</div>
              <div class="metric-label">Per Second</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">📊 Performance Insights</div>
          <div class="analytics-grid">
            <div class="metric-item">
              <div class="metric-value">${bestYear || 'N/A'}</div>
              <div class="metric-label">Best Year</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(bestYearAmount)}</div>
              <div class="metric-label">Best Year Total</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${highestIncome ? nfUSD.format(Number(highestIncome.paidUsd || 0)) : 'N/A'}</div>
              <div class="metric-label">Highest Entry</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${lowestIncome ? nfUSD.format(Number(lowestIncome.paidUsd || 0)) : 'N/A'}</div>
              <div class="metric-label">Lowest Entry</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">Smart Insights</div>
          <div class="insight-card">
            <div class="insight-text">
              You've earned <strong>${nfUSD.format(lifetimeIncome.totalUSD)}</strong> across <strong>${totalItems}</strong> projects over <strong>${Object.keys(yearDistribution).length}</strong> years.
              That's <strong>${nfUSD.format(lifetimeIncome.dailyUSD)}</strong> per day or <strong>${nfUSD.format(lifetimeIncome.hourlyUSD)}</strong> per hour!
              ${bestYear ? ` Your best year was <strong>${bestYear}</strong> with <strong>${nfUSD.format(bestYearAmount)}</strong>.` : ''}
              ${highestIncome ? ` Your highest single entry was <strong>${nfUSD.format(Number(highestIncome.paidUsd || 0))}</strong> from "${highestIncome.name || 'Unnamed Project'}".` : ''}
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">${incomeInsights.title}</div>
          <div class="insight-card">
            <div class="insight-text">
              ${incomeInsights.insights.map(insight => `<div class="insight-line">${insight}</div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    function updateIncomeMonthlyAnalytics(income) {
      const container = document.getElementById('analyticsIncomeMonthly');
      if (!container) return;

      const lifetimeIncome = lifetimeIncomeTotals();
      const currentYearData = state.income[currentYear] || [];
      const currentMonthIncome = income.mUSD;
      
      // Calculate actual monthly totals across all years
      const monthlyTotals = {};
      Object.keys(state.income).forEach(year => {
        const yearData = state.income[year] || [];
        yearData.forEach(r => {
          if (r.date && r.paidUsd) {
            const date = new Date(r.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyTotals[monthKey]) {
              monthlyTotals[monthKey] = 0;
            }
            monthlyTotals[monthKey] += Number(r.paidUsd || 0);
          }
        });
      });
      
      const allMonthlyTotals = Object.values(monthlyTotals);
      const avgMonthlyAllTime = allMonthlyTotals.length > 0 ? 
        allMonthlyTotals.reduce((sum, val) => sum + val, 0) / allMonthlyTotals.length : 0;
      const bestMonth = allMonthlyTotals.length > 0 ? Math.max(...allMonthlyTotals) : 0;
      const worstMonth = allMonthlyTotals.length > 0 ? Math.min(...allMonthlyTotals) : 0;
      
      // Performance comparison
      const vsAverage = avgMonthlyAllTime > 0 ? ((currentMonthIncome - avgMonthlyAllTime) / avgMonthlyAllTime) * 100 : 0;
      const vsBest = bestMonth > 0 ? ((currentMonthIncome - bestMonth) / bestMonth) * 100 : 0;

      container.innerHTML = `
        <div class="analytics-section">
          <div class="section-title">📅 Monthly Performance</div>
          <div class="analytics-grid-4">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(currentMonthIncome)}</div>
              <div class="metric-label">Current Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(avgMonthlyAllTime)}</div>
              <div class="metric-label">All-Time Avg</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(bestMonth)}</div>
              <div class="metric-label">Best Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(worstMonth)}</div>
              <div class="metric-label">Worst Month</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">⏰ Monthly Time Breakdown</div>
          <div class="analytics-grid-3">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.monthlyUSD)}</div>
              <div class="metric-label">Per Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.dailyUSD)}</div>
              <div class="metric-label">Per Day</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.hourlyUSD)}</div>
              <div class="metric-label">Per Hour</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.minutelyUSD)}</div>
              <div class="metric-label">Per Minute</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.secondlyUSD)}</div>
              <div class="metric-label">Per Second</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${currentYearData.length}</div>
              <div class="metric-label">This Year Entries</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">📊 Performance Comparison</div>
          <div class="analytics-grid">
            <div class="metric-item">
              <div class="metric-value ${vsAverage >= 0 ? 'trend-up' : 'trend-down'}">${vsAverage >= 0 ? '+' : ''}${vsAverage.toFixed(1)}%</div>
              <div class="metric-label">vs All-Time Avg</div>
            </div>
            <div class="metric-item">
              <div class="metric-value ${vsBest >= 0 ? 'trend-up' : 'trend-down'}">${vsBest >= 0 ? '+' : ''}${vsBest.toFixed(1)}%</div>
              <div class="metric-label">vs Best Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${allMonthlyTotals.length}</div>
              <div class="metric-label">Months Tracked</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.monthlySelected)}</div>
              <div class="metric-label">Monthly ${state.currencySymbol}</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">Monthly Insights</div>
          <div class="insight-card">
            <div class="insight-text">
              This month you're earning <strong>${nfUSD.format(currentMonthIncome)}</strong>, which is 
              <strong>${vsAverage >= 0 ? vsAverage.toFixed(1) + '% above' : Math.abs(vsAverage).toFixed(1) + '% below'}</strong> your all-time monthly average.
              ${bestMonth > 0 ? ` Your best month ever was <strong>${nfUSD.format(bestMonth)}</strong>.` : ''}
              At this rate, you earn <strong>${nfUSD.format(lifetimeIncome.dailyUSD)}</strong> per day!
            </div>
          </div>
        </div>
      `;
    }
    
    function updateIncomeYearlyAnalytics(income) {
      const container = document.getElementById('analyticsIncomeYearly');
      if (!container) return;

      const lifetimeIncome = lifetimeIncomeTotals();
      const currentYearData = state.income[currentYear] || [];
      const currentYearTotal = income.yUSD;
      
      // Calculate yearly performance across all years
      const yearlyTotals = {};
      Object.keys(state.income).forEach(year => {
        const yearData = state.income[year] || [];
        const yearTotal = yearData.reduce((sum, r) => sum + Number(r.paidUsd || 0), 0);
        if (yearTotal > 0) {
          yearlyTotals[year] = yearTotal;
        }
      });
      
      const allYearlyValues = Object.values(yearlyTotals);
      const avgYearlyAllTime = allYearlyValues.length > 0 ? 
        allYearlyValues.reduce((sum, val) => sum + val, 0) / allYearlyValues.length : 0;
      const bestYear = Object.keys(yearlyTotals).reduce((a, b) => 
        yearlyTotals[a] > yearlyTotals[b] ? a : b, Object.keys(yearlyTotals)[0]);
      const bestYearAmount = yearlyTotals[bestYear] || 0;
      const worstYearAmount = allYearlyValues.length > 0 ? Math.min(...allYearlyValues) : 0;
      
      // Performance comparison
      const vsAverage = avgYearlyAllTime > 0 ? ((currentYearTotal - avgYearlyAllTime) / avgYearlyAllTime) * 100 : 0;
      const vsBest = bestYearAmount > 0 ? ((currentYearTotal - bestYearAmount) / bestYearAmount) * 100 : 0;
      
      // Growth calculation
      const years = Object.keys(yearlyTotals).sort();
      const growthRate = years.length > 1 ? 
        ((yearlyTotals[years[years.length - 1]] - yearlyTotals[years[0]]) / yearlyTotals[years[0]]) * 100 : 0;

      container.innerHTML = `
        <div class="analytics-section">
          <div class="section-title">📈 Yearly Performance</div>
          <div class="analytics-grid-4">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(currentYearTotal)}</div>
              <div class="metric-label">This Year (${currentYear})</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(avgYearlyAllTime)}</div>
              <div class="metric-label">All-Time Avg</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(bestYearAmount)}</div>
              <div class="metric-label">Best Year (${bestYear || 'N/A'})</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(worstYearAmount)}</div>
              <div class="metric-label">Worst Year</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">⏰ Yearly Time Breakdown</div>
          <div class="analytics-grid-3">
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.yearlyUSD)}</div>
              <div class="metric-label">Per Year</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.monthlyUSD)}</div>
              <div class="metric-label">Per Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.dailyUSD)}</div>
              <div class="metric-label">Per Day</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.hourlyUSD)}</div>
              <div class="metric-label">Per Hour</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.minutelyUSD)}</div>
              <div class="metric-label">Per Minute</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${nfUSD.format(lifetimeIncome.secondlyUSD)}</div>
              <div class="metric-label">Per Second</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">📊 Growth & Comparison</div>
          <div class="analytics-grid">
            <div class="metric-item">
              <div class="metric-value ${vsAverage >= 0 ? 'trend-up' : 'trend-down'}">${vsAverage >= 0 ? '+' : ''}${vsAverage.toFixed(1)}%</div>
              <div class="metric-label">vs All-Time Avg</div>
            </div>
            <div class="metric-item">
              <div class="metric-value ${vsBest >= 0 ? 'trend-up' : 'trend-down'}">${vsBest >= 0 ? '+' : ''}${vsBest.toFixed(1)}%</div>
              <div class="metric-label">vs Best Year</div>
            </div>
            <div class="metric-item">
              <div class="metric-value ${growthRate >= 0 ? 'trend-up' : 'trend-down'}">${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%</div>
              <div class="metric-label">Total Growth</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${years.length}</div>
              <div class="metric-label">Years Tracked</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">💰 ${state.currencySymbol} Yearly Breakdown</div>
          <div class="analytics-grid">
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.yearlySelected)}</div>
              <div class="metric-label">Per Year</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.monthlySelected)}</div>
              <div class="metric-label">Per Month</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${formatCurrency(lifetimeIncome.dailySelected)}</div>
              <div class="metric-label">Per Day</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${currentYearData.length}</div>
              <div class="metric-label">This Year Entries</div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">Yearly Insights</div>
          <div class="insight-card">
            <div class="insight-text">
              This year (${currentYear}) you've earned <strong>${nfUSD.format(currentYearTotal)}</strong>, which is 
              <strong>${vsAverage >= 0 ? vsAverage.toFixed(1) + '% above' : Math.abs(vsAverage).toFixed(1) + '% below'}</strong> your all-time yearly average.
              ${bestYear && bestYear !== currentYear ? ` Your best year was <strong>${bestYear}</strong> with <strong>${nfUSD.format(bestYearAmount)}</strong>.` : ''}
              ${years.length > 1 ? ` Over ${years.length} years, you've grown by <strong>${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%</strong>!` : ''}
            </div>
          </div>
        </div>
      `;
    }

    // Insight Cards Utility Functions
    function generatePersonalInsights() {
      const personalActive = state.personal.filter(r => r.status === 'Active');
      const personalTotals = totals(state.personal);
      const incomeTotals = getCurrentIncomeTotals();
      
      const insights = [];
      
      // Always show basic spending info if there's any data
      if (personalActive.length > 0 && personalTotals.mUSD > 0) {
        const monthlyPersonal = personalTotals.mUSD;
        const dailySpending = monthlyPersonal / 30;
        const hourlySpending = dailySpending / 24;
        
        // Basic spending velocity - always show
        insights.push(`💰 Daily spending: ${nfUSD.format(dailySpending)} per day, ${nfUSD.format(hourlySpending)} per hour.`);
        
        // Income percentage if we have income data
        if (incomeTotals.monthly > 0) {
          const incomePercentage = (monthlyPersonal / incomeTotals.monthly) * 100;
          if (incomePercentage > 0) {
            insights.push(`📊 Personal expenses consume ${Math.round(incomePercentage)}% of your monthly income.`);
          }
        }
        
        // Top expense analysis
        const sortedByCost = personalActive.sort((a, b) => {
          const aCost = rowMonthlyUSD(a);
          const bCost = rowMonthlyUSD(b);
          return bCost - aCost;
        });
        
        if (sortedByCost.length > 0) {
          const topExpense = sortedByCost[0];
          const topCost = rowMonthlyUSD(topExpense);
          const topPercentage = monthlyPersonal > 0 ? (topCost / monthlyPersonal) * 100 : 0;
          
          if (topCost > 0) {
            insights.push(`🏆 Largest expense: ${topExpense.name || 'Unnamed'} at ${nfUSD.format(topCost)} (${Math.round(topPercentage)}% of total).`);
          }
        }
        
        // Billing analysis
        const annualItems = personalActive.filter(r => r.billing === 'Annually');
        const monthlyItems = personalActive.filter(r => r.billing === 'Monthly');
        
        if (annualItems.length > 0 || monthlyItems.length > 0) {
          insights.push(`📅 Billing mix: ${monthlyItems.length} monthly, ${annualItems.length} annual subscriptions.`);
        }
        
        // Cost per item analysis
        const avgCostPerItem = monthlyPersonal / personalActive.length;
        if (avgCostPerItem > 0) {
          insights.push(`📈 Average cost per expense: ${nfUSD.format(avgCostPerItem)} per item.`);
        }
        
        // Spending concentration
        if (sortedByCost.length >= 3) {
          const top3Spending = sortedByCost.slice(0, 3).reduce((sum, item) => {
            return sum + rowMonthlyUSD(item);
          }, 0);
          const concentrationRatio = monthlyPersonal > 0 ? (top3Spending / monthlyPersonal) * 100 : 0;
          
          if (concentrationRatio > 0) {
            insights.push(`🎯 Top 3 expenses represent ${Math.round(concentrationRatio)}% of your total spending.`);
          }
        }
        
        // Lifestyle assessment
        if (monthlyPersonal > 1000) {
          insights.push(`💎 High-spending lifestyle: ${nfUSD.format(monthlyPersonal)} monthly personal expenses.`);
        } else if (monthlyPersonal > 500) {
          insights.push(`⚖️ Moderate lifestyle: ${nfUSD.format(monthlyPersonal)} monthly personal expenses.`);
        } else {
          insights.push(`🎯 Lean lifestyle: ${nfUSD.format(monthlyPersonal)} monthly personal expenses.`);
        }
        
      } else {
        // No data insights
        insights.push("📝 No personal expenses tracked yet.");
        insights.push("💡 Add your first expense to see lifestyle insights.");
        insights.push("🏠 Track rent, food, utilities, and other personal costs.");
        insights.push("📊 Monitor your spending patterns over time.");
        insights.push("🔄 Set up recurring expenses for better tracking.");
      }

      return {
        title: "🏠 Lifestyle Insights",
        insights: insights.slice(0, 6)
      };
    }

    function generateBizInsights() {
      const bizActive = state.biz.filter(r => r.status === 'Active');
      const bizTotals = totals(state.biz);
      const incomeTotals = getCurrentIncomeTotals();
      
      const insights = [];
      
      // Always show basic business info if there's any data
      if (bizActive.length > 0 && bizTotals.mUSD > 0) {
        const monthlyBiz = bizTotals.mUSD;
        const dailyBusinessCost = monthlyBiz / 30;
        const hourlyBusinessCost = dailyBusinessCost / 24;
        
        // Basic business spending - always show
        insights.push(`💼 Daily business cost: ${nfUSD.format(dailyBusinessCost)} per day, ${nfUSD.format(hourlyBusinessCost)} per hour.`);
        
        // Income percentage if we have income data
        if (incomeTotals.monthly > 0) {
          const incomePercentage = (monthlyBiz / incomeTotals.monthly) * 100;
          if (incomePercentage > 0) {
            insights.push(`📊 Business tools consume ${Math.round(incomePercentage)}% of your monthly income.`);
          }
        }
        
        // Top tool analysis
        // For insights, we want to compare tools based on their true monthly equivalent cost
        const getMonthlyEquivalentCost = (r) => {
          if (r.status !== 'Active') return 0;
          if (r.billing === 'Monthly') return Number(r.cost || 0);
          if (r.billing === 'Annually') return Number(r.cost || 0) / 12;
          return 0;
        };
        
        const sortedByCost = bizActive.sort((a, b) => {
          const aCost = getMonthlyEquivalentCost(a);
          const bCost = getMonthlyEquivalentCost(b);
          return bCost - aCost;
        });
        
        if (sortedByCost.length > 0) {
          const topTool = sortedByCost[0];
          const topCost = getMonthlyEquivalentCost(topTool);
          
          // Calculate total monthly equivalent cost for percentage calculation
          const totalMonthlyEquivalent = bizActive.reduce((sum, r) => sum + getMonthlyEquivalentCost(r), 0);
          const topPercentage = totalMonthlyEquivalent > 0 ? (topCost / totalMonthlyEquivalent) * 100 : 0;
          
          if (topCost > 0) {
            insights.push(`🔧 Most expensive tool: ${topTool.name || 'Unnamed'} at ${nfUSD.format(topCost)} (${Math.round(topPercentage)}% of total).`);
          }
        }
        
        // Billing analysis
        const annualTools = bizActive.filter(r => r.billing === 'Annually');
        const monthlyTools = bizActive.filter(r => r.billing === 'Monthly');
        
        if (annualTools.length > 0 || monthlyTools.length > 0) {
          insights.push(`📅 Tool billing: ${monthlyTools.length} monthly, ${annualTools.length} annual subscriptions.`);
        }
        
        // Cost per tool analysis
        const avgCostPerTool = monthlyBiz / bizActive.length;
        if (avgCostPerTool > 0) {
          insights.push(`📈 Average cost per tool: ${nfUSD.format(avgCostPerTool)} per tool.`);
        }
        
        // Tool concentration
        if (sortedByCost.length >= 3) {
          const top3Tools = sortedByCost.slice(0, 3).reduce((sum, item) => {
            return sum + rowMonthlyUSD(item);
          }, 0);
          const toolConcentration = monthlyBiz > 0 ? (top3Tools / monthlyBiz) * 100 : 0;
          
          if (toolConcentration > 0) {
            insights.push(`🎯 Top 3 tools represent ${Math.round(toolConcentration)}% of your tool spending.`);
          }
        }
        
        // Business scale assessment
        if (monthlyBiz > 500) {
          insights.push(`🚀 Enterprise-level tools: ${nfUSD.format(monthlyBiz)} monthly business expenses.`);
        } else if (monthlyBiz > 200) {
          insights.push(`⚡ Growing business: ${nfUSD.format(monthlyBiz)} monthly business expenses.`);
        } else {
          insights.push(`🎯 Lean startup: ${nfUSD.format(monthlyBiz)} monthly business expenses.`);
        }
        
        // Tool count analysis
        if (bizActive.length > 10) {
          insights.push(`📚 Extensive tool stack: ${bizActive.length} active business tools.`);
        } else if (bizActive.length > 5) {
          insights.push(`📊 Moderate tool stack: ${bizActive.length} active business tools.`);
        } else {
          insights.push(`🎯 Focused tool stack: ${bizActive.length} active business tools.`);
        }
        
      } else {
        // No data insights
        insights.push("📝 No business expenses tracked yet.");
        insights.push("💡 Add your first business expense to see operation insights.");
        insights.push("🔧 Track tools, software, and operational costs.");
        insights.push("📊 Monitor your business efficiency over time.");
        insights.push("💰 Identify cost optimization opportunities.");
      }

      return {
        title: "💼 Business Insights",
        insights: insights.slice(0, 6)
      };
    }

    function generateIncomeInsights() {
      const currentYear = new Date().getFullYear().toString();
      const currentYearIncome = state.income[currentYear] || [];
      const allIncome = getAllIncomeData();
      
      const insights = [];
      
      // Always show basic income info if there's any data
      if (currentYearIncome.length > 0) {
        const currentYearTotal = currentYearIncome.reduce((sum, r) => sum + Number(r.paidUsd || 0), 0);
        const currentMonth = new Date().getMonth();
        const monthsElapsed = Math.max(1, currentMonth + 1);
        const monthlyAverage = currentYearTotal / monthsElapsed;
        
        if (currentYearTotal > 0) {
          // Basic income velocity - always show
          const dailyIncome = currentYearTotal / (monthsElapsed * 30);
          const hourlyIncome = dailyIncome / 24;
          const weeklyIncome = currentYearTotal / (monthsElapsed * 4.33);
          
          insights.push(`⚡ Income velocity: ${nfUSD.format(dailyIncome)} daily, ${nfUSD.format(hourlyIncome)} hourly.`);
          
          // Year total
          insights.push(`💰 Year-to-date earnings: ${nfUSD.format(currentYearTotal)} (${monthsElapsed} months).`);
          
          // Monthly average
          if (monthlyAverage > 0) {
            insights.push(`📊 Monthly average: ${nfUSD.format(monthlyAverage)} per month this year.`);
          }
          
          // Project count
          const uniqueProjects = new Set(currentYearIncome.map(entry => entry.projectName)).size;
          if (uniqueProjects > 0) {
            insights.push(`📈 Active projects: ${uniqueProjects} different projects this year.`);
          }
          
          // Payment methods analysis
          const paymentMethods = {};
          currentYearIncome.forEach(entry => {
            const method = entry.method || 'Other';
            paymentMethods[method] = (paymentMethods[method] || 0) + Number(entry.paidUsd || 0);
          });
          
          const topPaymentMethod = Object.entries(paymentMethods).sort(([,a], [,b]) => b - a)[0];
          if (topPaymentMethod && topPaymentMethod[1] > 0) {
            const percentage = (topPaymentMethod[1] / currentYearTotal) * 100;
            insights.push(`💳 Primary payment method: ${topPaymentMethod[0]} (${Math.round(percentage)}% of income).`);
          }
          
          // Project types analysis
          const projectTypes = {};
          currentYearIncome.forEach(entry => {
            const tags = entry.tags ? entry.tags.split(',').map(t => t.trim()) : ['Other'];
            tags.forEach(tag => {
              projectTypes[tag] = (projectTypes[tag] || 0) + Number(entry.paidUsd || 0);
            });
          });
          
          const topProjectType = Object.entries(projectTypes).sort(([,a], [,b]) => b - a)[0];
          if (topProjectType && topProjectType[1] > 0) {
            const percentage = (topProjectType[1] / currentYearTotal) * 100;
            insights.push(`🏆 Top project type: ${topProjectType[0]} (${Math.round(percentage)}% of income).`);
          }
          
          // Income scale assessment
          if (currentYearTotal > 100000) {
            insights.push(`🚀 High-earning year: ${nfUSD.format(currentYearTotal)} - excellent performance!`);
          } else if (currentYearTotal > 50000) {
            insights.push(`📈 Strong earnings: ${nfUSD.format(currentYearTotal)} - good progress.`);
          } else if (currentYearTotal > 20000) {
            insights.push(`📊 Moderate earnings: ${nfUSD.format(currentYearTotal)} - building momentum.`);
          } else {
            insights.push(`🎯 Early stage: ${nfUSD.format(currentYearTotal)} - foundation building.`);
          }
          
        } else {
          insights.push("📝 No income recorded yet this year.");
        }
        
      } else {
        // No data insights
        insights.push("📝 No income tracked for this year yet.");
        insights.push("💡 Add your first income entry to see earnings insights.");
        insights.push("📈 Track project payments and income sources.");
        insights.push("📊 Monitor your earning patterns over time.");
        insights.push("🏆 Identify your most profitable projects.");
      }

      return {
        title: "💰 Income Insights",
        insights: insights.slice(0, 6)
      };
    }

    function generateOverallInsights() {
      const personalTotals = totals(state.personal);
      const bizTotals = totals(state.biz);
      const incomeTotals = getCurrentIncomeTotals();
      
      const totalExpenses = personalTotals.mUSD + bizTotals.mUSD;
      const netIncome = incomeTotals.monthly - totalExpenses;
      const savingsRate = incomeTotals.monthly > 0 ? (netIncome / incomeTotals.monthly) * 100 : 0;
      
      const insights = [];
      
      // Always show basic financial info if we have any data
      if (totalExpenses > 0 || incomeTotals.monthly > 0) {
        // Cash flow analysis - always show
        if (netIncome > 0) {
          insights.push(`💰 Positive cash flow: +${nfUSD.format(netIncome)}/month (${Math.round(savingsRate)}% savings rate).`);
        } else if (netIncome < 0) {
          insights.push(`⚠️ Negative cash flow: -${nfUSD.format(Math.abs(netIncome))}/month deficit.`);
        } else {
          insights.push(`⚖️ Break-even: $0 monthly surplus.`);
        }
        
        // Financial velocity if we have income
        if (incomeTotals.monthly > 0) {
          const dailyIncome = incomeTotals.monthly / 30;
          const dailyExpenses = totalExpenses / 30;
          const hourlyIncome = dailyIncome / 24;
          const hourlyExpenses = dailyExpenses / 24;
          
          insights.push(`⚡ Financial velocity: Earning ${nfUSD.format(hourlyIncome)}/hour, spending ${nfUSD.format(hourlyExpenses)}/hour.`);
        }
        
        // Expense breakdown
        const personalRatio = incomeTotals.monthly > 0 ? (personalTotals.mUSD / incomeTotals.monthly) * 100 : 0;
        const bizRatio = incomeTotals.monthly > 0 ? (bizTotals.mUSD / incomeTotals.monthly) * 100 : 0;
        const totalRatio = personalRatio + bizRatio;
        
        if (totalRatio > 0) {
          insights.push(`📊 Expense breakdown: Personal ${Math.round(personalRatio)}%, Business ${Math.round(bizRatio)}% of income.`);
        }
        
        // Financial runway (how many months of expenses can be covered by current monthly savings)
        if (totalExpenses > 0) {
          if (netIncome > 0) {
            const currentRunway = Math.floor(netIncome / totalExpenses);
            if (currentRunway > 12) {
              insights.push(`🛡️ Strong runway: ${currentRunway}+ months of expenses covered by current monthly savings.`);
            } else if (currentRunway > 6) {
              insights.push(`✅ Good runway: ${currentRunway} months of expenses covered by current monthly savings.`);
            } else if (currentRunway > 0) {
              insights.push(`⚠️ Short runway: Only ${currentRunway} months of expenses covered by current monthly savings.`);
            }
          } else {
            insights.push(`🚨 No runway: Monthly deficit of ${nfUSD.format(Math.abs(netIncome))} - burning through savings.`);
          }
        }
        
        // Financial health assessment
        if (savingsRate > 30) {
          insights.push(`🏆 Excellent financial health: ${Math.round(savingsRate)}% savings rate - outstanding!`);
        } else if (savingsRate > 20) {
          insights.push(`✅ Great financial health: ${Math.round(savingsRate)}% savings rate - very good!`);
        } else if (savingsRate > 10) {
          insights.push(`📊 Good financial health: ${Math.round(savingsRate)}% savings rate - solid progress.`);
        } else if (savingsRate > 0) {
          insights.push(`📈 Building financial health: ${Math.round(savingsRate)}% savings rate - keep going!`);
        } else if (savingsRate < 0) {
          insights.push(`⚠️ Financial stress: ${Math.round(Math.abs(savingsRate))}% deficit - needs attention.`);
        }
        
        // Expense efficiency
        if (totalRatio > 0) {
          if (totalRatio < 50) {
            insights.push(`🚀 Ultra-efficient spending: Only ${Math.round(totalRatio)}% of income for expenses.`);
          } else if (totalRatio < 70) {
            insights.push(`✅ Efficient spending: ${Math.round(totalRatio)}% of income for expenses.`);
          } else {
            insights.push(`📊 High expense ratio: ${Math.round(totalRatio)}% of income for expenses.`);
          }
        }
        
        // Wealth building potential
        if (netIncome > 1000) {
          insights.push(`💎 High wealth building potential: ${nfUSD.format(netIncome)} monthly surplus.`);
        } else if (netIncome > 500) {
          insights.push(`📈 Good wealth building potential: ${nfUSD.format(netIncome)} monthly surplus.`);
        } else if (netIncome > 0) {
          insights.push(`🎯 Building wealth: ${nfUSD.format(netIncome)} monthly surplus.`);
        }
        
      } else {
        // No data insights
        insights.push("📝 No financial data tracked yet.");
        insights.push("💡 Add expenses and income to see financial health insights.");
        insights.push("📊 Track your spending and earning patterns.");
        insights.push("💰 Monitor your savings and investment potential.");
        insights.push("🎯 Set financial goals and track your progress.");
      }

      return {
        title: "📊 Financial Health",
        insights: insights.slice(0, 6)
      };
    }

    // Helper function to get current income totals
    function getCurrentIncomeTotals() {
      const currentYear = new Date().getFullYear().toString();
      const currentYearIncome = state.income[currentYear] || [];
      const currentMonth = new Date().getMonth();
      
      const monthlyIncome = currentYearIncome
        .filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth;
        })
        .reduce((sum, entry) => sum + Number(entry.paidUsd || 0), 0);
      
      const yearlyIncome = currentYearIncome
        .reduce((sum, entry) => sum + Number(entry.paidUsd || 0), 0);
      
      return {
        monthly: monthlyIncome,
        yearly: yearlyIncome,
        monthlyEGP: usdToEgp(monthlyIncome),
        yearlyEGP: usdToEgp(yearlyIncome)
      };
    }

    // Helper function to get all income data across years
    function getAllIncomeData() {
      const allIncome = [];
      Object.keys(state.income || {}).forEach(year => {
        const yearData = state.income[year] || [];
        allIncome.push(...yearData);
      });
      return allIncome;
    }

    // Analytics Page Functions
    function updateAnalyticsPage() {
      // Get current data
      const p = totals(state.personal);
      const b = totals(state.biz);
      const allExpenses = { mUSD: p.mUSD + b.mUSD, yUSD: p.yUSD + b.yUSD };
      allExpenses.mEGP = usdToEgp(allExpenses.mUSD);
      allExpenses.yEGP = usdToEgp(allExpenses.yUSD);
      
      const incomeTotals = getCurrentIncomeTotals();
      
      // 1. Net Cash Flow Analysis
      const netCashFlow = {
        mUSD: incomeTotals.monthly - allExpenses.mUSD,
        yUSD: incomeTotals.yearly - allExpenses.yUSD,
        mEGP: usdToEgp(incomeTotals.monthly - allExpenses.mUSD),
        yEGP: usdToEgp(incomeTotals.yearly - allExpenses.yUSD),
        mSelected: usdToSelectedCurrency(incomeTotals.monthly - allExpenses.mUSD),
        ySelected: usdToSelectedCurrency(incomeTotals.yearly - allExpenses.yUSD)
      };
      
      setText('analyticsCashFlowMonthlyUSD', nfUSD.format(netCashFlow.mUSD));
      setText('analyticsCashFlowMonthlyEGP', formatCurrency(netCashFlow.mSelected));
      setText('analyticsCashFlowYearlyUSD', nfUSD.format(netCashFlow.yUSD));
      setText('analyticsCashFlowYearlyEGP', formatCurrency(netCashFlow.ySelected));
      
      // Cash flow status
      const cashFlowStatus = netCashFlow.mUSD > 0 ? 'Positive' : netCashFlow.mUSD < 0 ? 'Negative' : 'Neutral';
      setText('analyticsCashFlowStatus', cashFlowStatus);
      
      // Income vs Expenses bars
      const maxAmount = Math.max(incomeTotals.monthly, allExpenses.mUSD);
      const incomeBarWidth = maxAmount > 0 ? (incomeTotals.monthly / maxAmount) * 100 : 0;
      const expensesBarWidth = maxAmount > 0 ? (allExpenses.mUSD / maxAmount) * 100 : 0;
      
      setText('analyticsIncomeVal', nfUSD.format(incomeTotals.monthly));
      setText('analyticsExpensesVal', nfUSD.format(allExpenses.mUSD));
      
      const incomeBar = $('#analyticsIncomeBar'); if(incomeBar) incomeBar.style.width = incomeBarWidth + '%';
      const expensesBar = $('#analyticsExpensesBar'); if(expensesBar) expensesBar.style.width = expensesBarWidth + '%';
      
      // 2. Savings Rate Analysis
      const savingsRateMonthly = incomeTotals.monthly > 0 ? (netCashFlow.mUSD / incomeTotals.monthly) * 100 : 0;
      const savingsRateYearly = incomeTotals.yearly > 0 ? (netCashFlow.yUSD / incomeTotals.yearly) * 100 : 0;
      
      setText('analyticsSavingsRateMonthly', savingsRateMonthly.toFixed(1) + '%');
      setText('analyticsSavingsRateYearly', savingsRateYearly.toFixed(1) + '%');
      
      // Savings status
      const monthlyStatus = savingsRateMonthly >= 20 ? 'Excellent' : 
                           savingsRateMonthly >= 10 ? 'Good' : 
                           savingsRateMonthly >= 5 ? 'Fair' : 
                           savingsRateMonthly >= 0 ? 'Poor' : 'Deficit';
      const yearlyStatus = savingsRateYearly >= 20 ? 'Excellent' : 
                          savingsRateYearly >= 10 ? 'Good' : 
                          savingsRateYearly >= 5 ? 'Fair' : 
                          savingsRateYearly >= 0 ? 'Poor' : 'Deficit';
      
      setText('analyticsSavingsRateMonthlyStatus', monthlyStatus);
      setText('analyticsSavingsRateYearlyStatus', yearlyStatus);
      
      // Savings target progress
      const targetSavings = 20; // 20% target
      const savingsProgress = Math.min(100, Math.max(0, (savingsRateMonthly / targetSavings) * 100));
      setText('analyticsSavingsTarget', savingsRateMonthly.toFixed(1) + '%');
      
      const savingsProgressBar = $('#analyticsSavingsProgressBar'); 
      if(savingsProgressBar) savingsProgressBar.style.width = savingsProgress + '%';
      
      // 3. Expense Efficiency Analysis
      const personalEfficiency = incomeTotals.monthly > 0 ? (p.mUSD / incomeTotals.monthly) * 100 : 0;
      const businessEfficiency = incomeTotals.monthly > 0 ? (b.mUSD / incomeTotals.monthly) * 100 : 0;
      const totalEfficiency = personalEfficiency + businessEfficiency;
      
      setText('analyticsPersonalEfficiency', personalEfficiency.toFixed(1) + '%');
      setText('analyticsBusinessEfficiency', businessEfficiency.toFixed(1) + '%');
      setText('analyticsTotalEfficiency', totalEfficiency.toFixed(1) + '%');
      
      // Efficiency status
      const personalStatus = personalEfficiency <= 50 ? 'Good' : personalEfficiency <= 70 ? 'Fair' : 'High';
      const businessStatus = businessEfficiency <= 30 ? 'Good' : businessEfficiency <= 50 ? 'Fair' : 'High';
      
      setText('analyticsPersonalEfficiencyStatus', personalStatus);
      setText('analyticsBusinessEfficiencyStatus', businessStatus);
      
      // Efficiency bar (inverse - lower is better)
      const efficiencyScore = Math.max(0, 100 - totalEfficiency);
      const efficiencyBar = $('#analyticsEfficiencyBar'); 
      if(efficiencyBar) efficiencyBar.style.width = efficiencyScore + '%';
      
      // 4. Financial Health Score
      let healthScore = 0;
      let healthGrade = 'F';
      
      if (incomeTotals.monthly > 0) {
        // Base score from savings rate (0-40 points, can go negative)
        const savingsScore = Math.min(40, Math.max(-40, savingsRateMonthly * 2));
        healthScore += savingsScore;
        
        // Cash flow bonus (0-20 points)
        if (netCashFlow.mUSD > 0) healthScore += 20;
        else if (netCashFlow.mUSD > -incomeTotals.monthly * 0.1) healthScore += 10;
        
        // Efficiency bonus (0-20 points)
        if (totalEfficiency <= 60) healthScore += 20;
        else if (totalEfficiency <= 80) healthScore += 10;
        
        // Income stability bonus (0-20 points)
        const incomeStability = incomeTotals.monthly > 0 ? 20 : 0;
        healthScore += incomeStability;
      }
      
      // Cap at 100
      healthScore = Math.min(100, Math.max(0, healthScore));
      
      // Determine grade
      if (healthScore >= 90) healthGrade = 'A+';
      else if (healthScore >= 80) healthGrade = 'A';
      else if (healthScore >= 70) healthGrade = 'B';
      else if (healthScore >= 60) healthGrade = 'C';
      else if (healthScore >= 50) healthGrade = 'D';
      else healthGrade = 'F';
      
      setText('analyticsHealthScore', Math.round(healthScore));
      setText('analyticsHealthGrade', healthGrade);
      setText('analyticsHealthScoreStatus', '/100');
      setText('analyticsHealthGradeStatus', 'Grade');
      
      // Health progress bar
      const healthBar = $('#analyticsHealthBar'); 
      if(healthBar) healthBar.style.width = healthScore + '%';
      setText('analyticsHealthProgress', Math.round(healthScore) + '%');
      
      // Apply color coding to health score
      const healthScoreElement = document.getElementById('analyticsHealthScore');
      if (healthScoreElement) {
        healthScoreElement.removeAttribute('data-health');
        if (healthScore >= 80) healthScoreElement.setAttribute('data-health', 'excellent');
        else if (healthScore >= 60) healthScoreElement.setAttribute('data-health', 'good');
        else if (healthScore >= 40) healthScoreElement.setAttribute('data-health', 'fair');
        else if (healthScore >= 20) healthScoreElement.setAttribute('data-health', 'poor');
        else healthScoreElement.setAttribute('data-health', 'critical');
      }
        
        // Update analytics content for expanded cards
      updateAllAnalytics(allExpenses, p, b);
        updatePersonalAnalytics(p);
        updateBizAnalytics(b);
        updateIncomeAllAnalytics(incomeTotals);
        
        // Update insight cards
        updateInsightCards();
    }

    function updateInsightCards() {
      // Update Personal Insights Card
      const personalInsights = generatePersonalInsights();
      const personalCard = $('#personalInsightsCard');
      if (personalCard) {
        personalCard.innerHTML = personalInsights.insights.map(insight => 
          `<div class="insight-line">${insight}</div>`
        ).join('');
      }
      
      // Update Business Insights Card
      const bizInsights = generateBizInsights();
      const bizCard = $('#bizInsightsCard');
      if (bizCard) {
        bizCard.innerHTML = bizInsights.insights.map(insight => 
          `<div class="insight-line">${insight}</div>`
        ).join('');
      }
      
      // Update Income Insights Card
      const incomeInsights = generateIncomeInsights();
      const incomeCard = $('#incomeInsightsCard');
      if (incomeCard) {
        incomeCard.innerHTML = incomeInsights.insights.map(insight => 
          `<div class="insight-line">${insight}</div>`
        ).join('');
      }
      
      // Update Overall Financial Health Card
      const overallInsights = generateOverallInsights();
      const overallCard = $('#overallInsightsCard');
      if (overallCard) {
        overallCard.innerHTML = overallInsights.insights.map(insight => 
          `<div class="insight-line">${insight}</div>`
        ).join('');
      }
    }

    // Analytics functionality
    function updateAnalytics() {
      const p = totals(state.personal);
      const b = totals(state.biz);
      const all = { mUSD: p.mUSD + b.mUSD, yUSD: p.yUSD + b.yUSD };
      all.mEGP = usdToEgp(all.mUSD);
      all.yEGP = usdToEgp(all.yUSD);

      // Update All analytics
      updateAllAnalytics(all, p, b);
      
      // Update Personal analytics
      updatePersonalAnalytics(p);
      
      // Update Biz analytics
      updateBizAnalytics(b);
      
      // Update insight cards (always update for expanded views)
      updateInsightCards();
    }

    function updateAllAnalytics(all, personal, biz) {
      const container = document.getElementById('analyticsAll');
      if (!container) return;

      const personalActive = state.personal.filter(r => r.status === 'Active');
      const bizActive = state.biz.filter(r => r.status === 'Active');
      const totalActive = personalActive.length + bizActive.length;
      const totalCancelled = state.personal.filter(r => r.status === 'Cancelled').length + state.biz.filter(r => r.status === 'Cancelled').length;
      
      // Calculate averages
      const avgPersonal = personalActive.length > 0 ? personal.mUSD / personalActive.length : 0;
      const avgBiz = bizActive.length > 0 ? biz.mUSD / bizActive.length : 0;
      const avgAll = totalActive > 0 ? all.mUSD / totalActive : 0;
      
      // Calculate monthly vs annual distribution
      const personalMonthly = personalActive.filter(r => r.billing === 'Monthly').length;
      const personalAnnual = personalActive.filter(r => r.billing === 'Annually').length;
      const bizMonthly = bizActive.filter(r => r.billing === 'Monthly').length;
      const bizAnnual = bizActive.filter(r => r.billing === 'Annually').length;
      
      // Calculate savings potential
      const personalAnnualSavings = personalActive
        .filter(r => r.billing === 'Annually')
        .reduce((sum, r) => sum + (Number(r.cost || 0) * 0.1), 0);
      const bizAnnualSavings = bizActive
        .filter(r => r.billing === 'Annually')
        .reduce((sum, r) => sum + (Number(r.cost || 0) * 0.1), 0);
      
      // Calculate spending breakdowns
      const dailySpending = all.mUSD / 30;
      const weeklySpending = all.mUSD / 4.33;
      const hourlySpending = all.mUSD / 720; // 30 days * 24 hours
      
      // Find highest expenses across all categories
      const allActiveItems = [...personalActive, ...bizActive];
      const sortedByCost = allActiveItems.sort((a, b) => {
        const aCost = a.billing === 'Monthly' ? Number(a.cost || 0) : Number(a.cost || 0) / 12;
        const bCost = b.billing === 'Monthly' ? Number(b.cost || 0) : Number(b.cost || 0) / 12;
        return bCost - aCost;
      });
      
      const highestExpense = sortedByCost[0];
      const totalMonthlyBills = personalMonthly + bizMonthly;
      const totalAnnualBills = personalAnnual + bizAnnual;

      // Get overall insights once
      const overallInsights = generateOverallInsights();

      container.innerHTML = `
        <div class="analytics-grid-4">
          <div class="analytics-section">
            <div class="section-title">Total Subscriptions</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${totalActive + totalCancelled}</div>
                <div class="metric-label">All Time</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${Math.round(((totalActive / (totalActive + totalCancelled)) * 100) || 0)}%</div>
                <div class="metric-label">Active Rate</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Cost Efficiency</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(avgAll)}</div>
                <div class="metric-label">Avg/Service</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(Math.max(...[personal.mUSD, biz.mUSD]))}</div>
                <div class="metric-label">Highest Category</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Time Breakdown</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(all.mUSD)}</div>
                <div class="metric-label">Monthly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(dailySpending)}</div>
                <div class="metric-label">Daily</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(weeklySpending)}</div>
                <div class="metric-label">Weekly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(hourlySpending)}</div>
                <div class="metric-label">Hourly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(hourlySpending / 60)}</div>
                <div class="metric-label">Per Minute</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format((hourlySpending / 60) / 60)}</div>
                <div class="metric-label">Per Second</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(all.yUSD)}</div>
                <div class="metric-label">Yearly</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Currency Split</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${Math.round((all.mUSD / (all.mUSD + all.mEGP * 0.032) * 100) || 0)}%</div>
                <div class="metric-label">USD Share</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${Math.round((all.mEGP * 0.032 / (all.mUSD + all.mEGP * 0.032) * 100) || 0)}%</div>
                <div class="metric-label">${state.currencySymbol} Share</div>
              </div>
            </div>
          </div>
        </div>

        <div class="analytics-grid-3">
          <div class="analytics-section">
            <div class="section-title">Category Distribution</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">Personal (${personalActive.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(personal.mUSD)}</span>
                  <span class="breakdown-percentage">${all.mUSD > 0 ? Math.round((personal.mUSD / all.mUSD) * 100) : 0}%</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Business (${bizActive.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(biz.mUSD)}</span>
                  <span class="breakdown-percentage">${all.mUSD > 0 ? Math.round((biz.mUSD / all.mUSD) * 100) : 0}%</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Billing Distribution</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">Monthly (${totalMonthlyBills})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(personalActive.filter(r => r.billing === 'Monthly').reduce((sum, r) => sum + Number(r.cost || 0), 0) + bizActive.filter(r => r.billing === 'Monthly').reduce((sum, r) => sum + Number(r.cost || 0), 0))}</span>
                  <span class="breakdown-percentage">${totalActive > 0 ? Math.round((totalMonthlyBills / totalActive) * 100) : 0}%</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Annual (${totalAnnualBills})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(personalActive.filter(r => r.billing === 'Annually').reduce((sum, r) => sum + Number(r.cost || 0) / 12, 0) + bizActive.filter(r => r.billing === 'Annually').reduce((sum, r) => sum + Number(r.cost || 0) / 12, 0))}</span>
                  <span class="breakdown-percentage">${totalActive > 0 ? Math.round((totalAnnualBills / totalActive) * 100) : 0}%</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Top Expenses</div>
            <ul class="breakdown-list">
              ${sortedByCost.slice(0, 3).map(item => {
                const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
                const category = state.personal.includes(item) ? 'Personal' : 'Business';
                return `
                  <li class="breakdown-item">
                    <span class="breakdown-name">${item.name || 'Unnamed'} (${category})</span>
                    <div>
                      <span class="breakdown-amount">${nfUSD.format(monthlyCost)}</span>
                      <span class="breakdown-percentage">${item.billing}</span>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">Insights</div>
          <div class="insight-card">
            <div class="insight-text">
              Total Portfolio: <strong>${totalActive + totalCancelled}</strong> services | Monthly Burn: <strong>${nfUSD.format(all.mUSD)}</strong> | 
              Efficiency: <strong>${Math.round((totalActive / (totalActive + totalCancelled)) * 100) || 0}%</strong> active rate
              ${highestExpense ? ` | Top Expense: <strong>${highestExpense.name || 'Unnamed'}</strong> (${nfUSD.format(highestExpense.billing === 'Monthly' ? Number(highestExpense.cost || 0) : Number(highestExpense.cost || 0) / 12)})` : ''}
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <div class="section-title">${overallInsights.title}</div>
          <div class="insight-card">
            <div class="insight-text">
              ${overallInsights.insights.map(insight => `<div class="insight-line">${insight}</div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    function updatePersonalAnalytics(personal) {
      const container = document.getElementById('analyticsPersonal');
      if (!container) return;

      const activeItems = state.personal.filter(r => r.status === 'Active');
      const monthlyItems = activeItems.filter(r => r.billing === 'Monthly');
      const annualItems = activeItems.filter(r => r.billing === 'Annually');
      const cancelledItems = state.personal.filter(r => r.status === 'Cancelled');
      
      // Calculate detailed metrics
      const avgMonthly = monthlyItems.length > 0 ? monthlyItems.reduce((sum, r) => sum + Number(r.cost || 0), 0) / monthlyItems.length : 0;
      const avgAnnual = annualItems.length > 0 ? annualItems.reduce((sum, r) => sum + Number(r.cost || 0), 0) / annualItems.length : 0;
      const avgAll = activeItems.length > 0 ? personal.mUSD / activeItems.length : 0;
      
      // Calculate spending breakdowns
      const dailyPersonal = personal.mUSD / 30;
      const weeklyPersonal = personal.mUSD / 4.33;
      const hourlyPersonal = personal.mUSD / 720;
      
      // Calculate potential savings
      const annualSavings = annualItems.reduce((sum, r) => sum + (Number(r.cost || 0) * 0.1), 0);
      
      // Find expense patterns
      const sortedByCost = activeItems.sort((a, b) => {
        const aCost = a.billing === 'Monthly' ? Number(a.cost || 0) : Number(a.cost || 0) / 12;
        const bCost = b.billing === 'Monthly' ? Number(b.cost || 0) : Number(b.cost || 0) / 12;
        return bCost - aCost;
      });
      
      const highestExpense = sortedByCost[0];
      const lowestExpense = sortedByCost[sortedByCost.length - 1];
      
      // Calculate cost distribution
      const highCostItems = activeItems.filter(item => {
        const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
        return monthlyCost > avgAll;
      }).length;
      
      const lowCostItems = activeItems.filter(item => {
        const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
        return monthlyCost <= avgAll;
      }).length;

      // Calculate monthly vs annual spending amounts
      const monthlySpending = monthlyItems.reduce((sum, r) => sum + Number(r.cost || 0), 0);
      const annualSpending = annualItems.reduce((sum, r) => sum + Number(r.cost || 0) / 12, 0);


      container.innerHTML = `
        <div class="analytics-grid-4">
          <div class="analytics-section">
            <div class="section-title">Personal Portfolio</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${activeItems.length}</div>
                <div class="metric-label">Active Services</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${cancelledItems.length}</div>
                <div class="metric-label">Discontinued</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Spending Patterns</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(avgMonthly)}</div>
                <div class="metric-label">Avg Monthly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(avgAnnual)}</div>
                <div class="metric-label">Avg Annual</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Cost Distribution</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${highCostItems}</div>
                <div class="metric-label">Premium Items</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${lowCostItems}</div>
                <div class="metric-label">Budget Items</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Time Breakdown</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(personal.mUSD)}</div>
                <div class="metric-label">Monthly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(dailyPersonal)}</div>
                <div class="metric-label">Daily</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(hourlyPersonal)}</div>
                <div class="metric-label">Hourly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(hourlyPersonal / 60)}</div>
                <div class="metric-label">Per Minute</div>
            </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format((hourlyPersonal / 60) / 60)}</div>
                <div class="metric-label">Per Second</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(personal.yUSD)}</div>
                <div class="metric-label">Yearly</div>
              </div>
            </div>
          </div>
        </div>

        <div class="analytics-grid-3">
          <div class="analytics-section">
            <div class="section-title">Billing Distribution</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">Monthly (${monthlyItems.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(monthlySpending)}</span>
                  <span class="breakdown-percentage">${personal.mUSD > 0 ? Math.round((monthlySpending / personal.mUSD) * 100) : 0}%</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Annual (${annualItems.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(annualSpending)}</span>
                  <span class="breakdown-percentage">${personal.mUSD > 0 ? Math.round((annualSpending / personal.mUSD) * 100) : 0}%</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Expense Analysis</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">High-Cost (>${nfUSD.format(avgAll)})</span>
                <div>
                  <span class="breakdown-amount">${highCostItems}</span>
                  <span class="breakdown-percentage">items</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Low-Cost (≤${nfUSD.format(avgAll)})</span>
                <div>
                  <span class="breakdown-amount">${lowCostItems}</span>
                  <span class="breakdown-percentage">items</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Top Expenses</div>
            <ul class="breakdown-list">
              ${sortedByCost.slice(0, 3).map(item => {
                const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
                return `
                  <li class="breakdown-item">
                    <span class="breakdown-name">${item.name || 'Unnamed'}</span>
                    <div>
                      <span class="breakdown-amount">${nfUSD.format(monthlyCost)}</span>
                      <span class="breakdown-percentage">${item.billing}</span>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        </div>

      `;
    }

    function updateBizAnalytics(biz) {
      const container = document.getElementById('analyticsBiz');
      if (!container) return;

      const activeItems = state.biz.filter(r => r.status === 'Active');
      const monthlyItems = activeItems.filter(r => r.billing === 'Monthly');
      const annualItems = activeItems.filter(r => r.billing === 'Annually');
      const cancelledItems = state.biz.filter(r => r.status === 'Cancelled');
      
      // Calculate detailed metrics
      const avgMonthly = monthlyItems.length > 0 ? monthlyItems.reduce((sum, r) => sum + Number(r.cost || 0), 0) / monthlyItems.length : 0;
      const avgAnnual = annualItems.length > 0 ? annualItems.reduce((sum, r) => sum + Number(r.cost || 0), 0) / annualItems.length : 0;
      const avgAll = activeItems.length > 0 ? biz.mUSD / activeItems.length : 0;
      
      // Calculate daily and weekly business spending
      const dailyBiz = biz.mUSD / 30;
      const weeklyBiz = biz.mUSD / 4.33;
      
      // Calculate potential savings from annual discounts
      const annualSavings = annualItems.reduce((sum, r) => sum + (Number(r.cost || 0) * 0.1), 0);
      
      // Find upcoming renewals (within 30 days) - all dates
      const upcomingRenewals = activeItems.filter(item => {
        if (!item.next) return false;
        const nextDate = new Date(item.next);
        const today = new Date();
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      });
      
      // Find renewals due in next 7 days (urgent) - all dates
      const urgentRenewals = activeItems.filter(item => {
        if (!item.next) return false;
        const nextDate = new Date(item.next);
        const today = new Date();
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });
      
      // Find highest and lowest expenses
      const sortedByCost = activeItems.sort((a, b) => {
        const aCost = a.billing === 'Monthly' ? Number(a.cost || 0) : Number(a.cost || 0) / 12;
        const bCost = b.billing === 'Monthly' ? Number(b.cost || 0) : Number(b.cost || 0) / 12;
        return bCost - aCost;
      });
      
      const highestExpense = sortedByCost[0];
      
      // Calculate cost distribution
      const highCostItems = activeItems.filter(item => {
        const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
        return monthlyCost > avgAll;
      }).length;
      
      const lowCostItems = activeItems.filter(item => {
        const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
        return monthlyCost <= avgAll;
      }).length;
      
      // Calculate total upcoming renewal costs
      const upcomingRenewalCosts = upcomingRenewals.reduce((sum, item) => {
        return sum + Number(item.cost || 0);
      }, 0);


      container.innerHTML = `
        <div class="analytics-grid-4">
          <div class="analytics-section">
            <div class="section-title">Business Portfolio</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${activeItems.length}</div>
                <div class="metric-label">Active Tools</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${cancelledItems.length}</div>
                <div class="metric-label">Discontinued</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Renewal Status</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${upcomingRenewals.length}</div>
                <div class="metric-label">Due Soon</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${urgentRenewals.length}</div>
                <div class="metric-label">Urgent (7d)</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Investment Analysis</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(avgMonthly)}</div>
                <div class="metric-label">Avg Monthly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(avgAnnual)}</div>
                <div class="metric-label">Avg Annual</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Time Breakdown</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(biz.mUSD)}</div>
                <div class="metric-label">Monthly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(dailyBiz)}</div>
                <div class="metric-label">Daily</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(weeklyBiz)}</div>
                <div class="metric-label">Weekly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(dailyBiz / 24)}</div>
                <div class="metric-label">Hourly</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format((dailyBiz / 24) / 60)}</div>
                <div class="metric-label">Per Minute</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(((dailyBiz / 24) / 60) / 60)}</div>
                <div class="metric-label">Per Second</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${nfUSD.format(biz.yUSD)}</div>
                <div class="metric-label">Yearly</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="section-title">Cost Efficiency</div>
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-value">${highCostItems}</div>
                <div class="metric-label">High-Value</div>
              </div>
              <div class="metric-item">
                <div class="metric-value">${lowCostItems}</div>
                <div class="metric-label">Essential</div>
              </div>
            </div>
          </div>
        </div>

        <div class="analytics-grid-3">
          <div class="analytics-section">
            <div class="section-title">Billing Distribution</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">Monthly (${monthlyItems.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(monthlyItems.reduce((sum, r) => sum + Number(r.cost || 0), 0))}</span>
                  <span class="breakdown-percentage">${biz.mUSD > 0 ? Math.round((monthlyItems.reduce((sum, r) => sum + Number(r.cost || 0), 0) / biz.mUSD) * 100) : 0}%</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Annual (${annualItems.length})</span>
                <div>
                  <span class="breakdown-amount">${nfUSD.format(annualItems.reduce((sum, r) => sum + Number(r.cost || 0) / 12, 0))}</span>
                  <span class="breakdown-percentage">${biz.mUSD > 0 ? Math.round((annualItems.reduce((sum, r) => sum + Number(r.cost || 0) / 12, 0) / biz.mUSD) * 100) : 0}%</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Expense Analysis</div>
            <ul class="breakdown-list">
              <li class="breakdown-item">
                <span class="breakdown-name">High-Cost (>${nfUSD.format(avgAll)})</span>
                <div>
                  <span class="breakdown-amount">${highCostItems}</span>
                  <span class="breakdown-percentage">items</span>
                </div>
              </li>
              <li class="breakdown-item">
                <span class="breakdown-name">Low-Cost (≤${nfUSD.format(avgAll)})</span>
                <div>
                  <span class="breakdown-amount">${lowCostItems}</span>
                  <span class="breakdown-percentage">items</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="analytics-section">
            <div class="section-title">Top Expenses</div>
            <ul class="breakdown-list">
              ${sortedByCost.slice(0, 3).map(item => {
                const monthlyCost = item.billing === 'Monthly' ? Number(item.cost || 0) : Number(item.cost || 0) / 12;
                return `
                  <li class="breakdown-item">
                    <span class="breakdown-name">${item.name || 'Unnamed'}</span>
                    <div>
                      <span class="breakdown-amount">${nfUSD.format(monthlyCost)}</span>
                      <span class="breakdown-percentage">${item.billing}</span>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        </div>

        ${upcomingRenewals.length > 0 ? `
        <div class="analytics-section">
          <div class="section-title">Upcoming Renewals</div>
          <ul class="breakdown-list">
            ${upcomingRenewals.slice(0, 3).map(item => {
              const nextDate = new Date(item.next);
              const today = new Date();
              const diffTime = nextDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              let statusText;
              if (diffDays === 0) {
                statusText = 'Today';
              } else if (diffDays === 1) {
                statusText = 'Tomorrow';
              } else if (diffDays > 0) {
                statusText = `${diffDays} days`;
              } else {
                statusText = 'Overdue';
              }
              return `
                <li class="breakdown-item">
                  <span class="breakdown-name">${item.name || 'Unnamed'}</span>
                  <div>
                    <span class="breakdown-amount">${formatDateForDisplay(item.next)}</span>
                    <span class="breakdown-percentage">${statusText}</span>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="analytics-section">
          <div class="section-title">Insights</div>
          <div class="insight-card">
            <div class="insight-text">
              Business Investment: <strong>${nfUSD.format(biz.mUSD)}</strong>/month | 
              Tool Efficiency: <strong>${Math.round((highCostItems / activeItems.length) * 100) || 0}%</strong> high-value tools | 
              Renewal Alert: <strong>${upcomingRenewals.length}</strong> due soon
              ${highestExpense ? ` | Top Investment: <strong>${highestExpense.name || 'Unnamed'}</strong> (${nfUSD.format(highestExpense.billing === 'Monthly' ? Number(highestExpense.cost || 0) : Number(highestExpense.cost || 0) / 12)})` : ''}
              ${upcomingRenewalCosts > 0 ? ` | Upcoming Costs: <strong>${nfUSD.format(upcomingRenewalCosts)}</strong>` : ''}
              ${annualSavings > 0 ? ` | Annual Savings: <strong>${nfUSD.format(annualSavings)}</strong>` : ''}
            </div>
          </div>
        </div>

      `;
    }

    // Icon Picker
    const iconPickerEl = document.getElementById('iconPicker');
    const iconSearchEl = document.getElementById('iconSearch');
    const iconGridEl = document.getElementById('iconPickerGrid');
    let iconPickCtx = null; // { arr, idx }

    let FONTAWESOME_ICONS = [];
    let faLoaded = false;
    const ICON_CACHE_KEY = 'finance-icon-cache-fontawesome-v3';
    const CUSTOM_ICONS_KEY = 'finance-custom-icons-v1';
    let customIcons = [];
    let currentStyle = 'solid'; // 'solid' or 'regular'

    // Load custom icons from localStorage (synchronous)
    function loadCustomIcons() {
      try {
        const stored = localStorage.getItem(CUSTOM_ICONS_KEY);
        if (stored) {
          customIcons = JSON.parse(stored);
        }
      } catch (e) {
        customIcons = [];
      }
    }
    
    // Load custom icons from Supabase (asynchronous)
    async function loadCustomIconsFromSupabase() {
      try {
        // Load from localStorage first
        const stored = localStorage.getItem(CUSTOM_ICONS_KEY);
        if (stored) {
          customIcons = JSON.parse(stored);
        }
        
        // Load from Supabase if authenticated
        if (supabaseReady && currentUser) {
          try {
            const supabaseIcons = await loadCustomImagesFromSupabase();
            // Merge with existing custom icons, avoiding duplicates
            supabaseIcons.forEach(icon => {
              const exists = customIcons.some(existingIcon => existingIcon.id === icon.id);
              if (!exists) {
                customIcons.push(icon);
              }
            });
            
            // Save merged icons back to localStorage
            localStorage.setItem(CUSTOM_ICONS_KEY, JSON.stringify(customIcons));
          } catch (error) {

          }
        }
      } catch (e) {
        customIcons = [];
      }
    }

    // Save custom icons to localStorage
    function saveCustomIcons() {
      try {
        localStorage.setItem(CUSTOM_ICONS_KEY, JSON.stringify(customIcons));
      } catch (e) {

      }
    }
    
    // Delete custom icon
    async function deleteCustomIcon(customId) {
      try {
        // Find the custom icon
        const customIcon = customIcons.find(icon => icon.id === customId);
        if (!customIcon) {

          return;
        }
        
        // If it's a Supabase image, try to delete from Supabase
        if (customIcon.data.startsWith('http') && supabaseReady && currentUser) {
          try {
            // Extract filename from URL
            const url = new URL(customIcon.data);
            const filename = url.pathname.split('/').pop();
            const fullPath = `custom-icons/${currentUser.id}/${filename}`;
            
            // Delete from storage
            const { error: storageError } = await window.supabaseClient.storage
              .from('custom-icons')
              .remove([fullPath]);
            
            if (storageError) {

            } else {

            }
            
            // Update user_settings to remove the icon
            const updatedIcons = customIcons.filter(icon => icon.id !== customId);
            const { error: dbError } = await window.supabaseClient
              .from('user_settings')
              .update({
                custom_icons: JSON.stringify(updatedIcons)
              })
              .eq('user_id', currentUser.id);
            
            if (dbError) {

            } else {

            }
          } catch (error) {

          }
        }
        
        // Remove from local array
        customIcons = customIcons.filter(icon => icon.id !== customId);
        
        // Save to localStorage
        saveCustomIcons();
        
        // Re-render icon picker
        renderIconPicker(iconSearchEl.value, currentTab);
        
        showNotification('Custom icon deleted successfully!', 'success');
      } catch (error) {

        showNotification('Failed to delete custom icon', 'error');
      }
    }

    // Add custom icon
    function addCustomIcon(iconData, type, name) {
      const customIcon = {
        id: Date.now().toString(),
        data: iconData,
        type: type, // 'image' or 'glyph'
        name: name || `Custom ${type}`,
        dateAdded: new Date().toISOString()
      };
      customIcons.push(customIcon);
      saveCustomIcons();
    }

    async function ensureFontAwesomeLoaded(){
      if(faLoaded && FONTAWESOME_ICONS.length) return;
      try{
        // try cache first
        const cached = localStorage.getItem(ICON_CACHE_KEY);
        if(cached){
          FONTAWESOME_ICONS = JSON.parse(cached);
          faLoaded = true;
          return;
        }
        
        // Get only VERIFIED WORKING icons (tested and confirmed for Font Awesome 7.0.0)
        const curatedIcons = [
          // Personal icons (VERIFIED SOLID)
          'home','user','heart','star','gift','coffee','book','music','camera','car','plane','bus','shopping-cart','wallet','credit-card','calendar','clock','phone','envelope','utensils','bed','laptop','headphones','gamepad','tree','sun','moon','cloud','fire','bolt','shield','lock','key','search','download','upload','share','edit','trash','plus','minus','check','times','arrow-right','arrow-left','arrow-up','arrow-down','eye','bookmark','flag','thumbs-up','smile','comment','bell','cog','wrench','image','video','play','pause','stop','save','folder','file',
          
          // Business icons (VERIFIED SOLID)
          'briefcase','building','chart-line','chart-bar','chart-pie','calculator','coins','university','store','truck','box','clipboard','list','calendar-check','server','database','sync','users','handshake','target','trophy','award','graduation-cap','archive','inbox','paper-plane','print','expand','compress','check-circle','exclamation-circle','question-circle','info-circle','ban','unlock','sort','th-list','th','table','square','circle','equals','divide','percentage','compass','triangle',
          
          // Brand icons (VERIFIED BRANDS for FA 7.0.0)
          'amazon','apple','google','microsoft','facebook','twitter','instagram','linkedin','youtube','github','reddit','discord','slack','telegram','whatsapp','dropbox','stripe','paypal','visa','mastercard','bitcoin','dribbble','behance','figma','trello','wordpress','medium','chrome','firefox','android','spotify','netflix','adobe','shopify','wix','zoom','skype','docker','aws','gitlab','bitbucket','stackoverflow','codepen','npm','node-js','react','vue','angular','html5','css3','js','python','java','git','webflow'
        ];
        
        FONTAWESOME_ICONS = curatedIcons.map(name => `fa:${name}`);
        localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(FONTAWESOME_ICONS));
        faLoaded = true;
      }catch(err){
        // Fallback minimal set
        FONTAWESOME_ICONS = ['fa:home','fa:user','fa:heart','fa:star','fa:briefcase','fa:building','fa:chart-line','fa:calculator','fa:wallet','fa:shopping-cart','fa:car','fa:plane','fa:laptop','fa:phone','fa:envelope','fa:calendar','fa:clock','fa:search','fa:settings','fa:trash','fa:edit','fa:plus','fa:minus','fa:check','fa:times'];
        faLoaded = true;
      }
    }

    function renderIconPicker(filter, category = 'all'){
      const q = (filter||'').trim().toLowerCase();
      iconGridEl.innerHTML = '';
      
      let items = [];
      
      // Filter by category
      if(category === 'custom'){
        items = customIcons.map(icon => `custom:${icon.id}`);
      } else if(category === 'personal'){
        items = FONTAWESOME_ICONS.filter(n => ['home','user','heart','star','gift','coffee','book','music','camera','tv','car','plane','train','bus','shopping','wallet','calendar','phone','envelope','utensils','bed','laptop','mobile','headphones','gamepad','football','tree','leaf','sun','moon','cloud','umbrella','fire','bolt','shield','lock','key','search','filter','download','upload','share','copy','edit','trash','plus','minus','check','times','arrow','eye','bookmark','flag','thumbs','smile','comment','bell','cog','tools','paint','image','video','film','microphone','volume','play','pause','stop','forward','backward','random','repeat','refresh','sync','undo','redo','save','folder','file'].some(keyword => n.includes(keyword)));
      } else if(category === 'business'){
        items = FONTAWESOME_ICONS.filter(n => ['briefcase','building','chart','calculator','file','receipt','money','coins','credit','university','store','warehouse','factory','truck','shipping','box','package','clipboard','list','check','calendar','clock','network','server','database','cloud','sync','cogs','wrench','hammer','tools','project','users','handshake','bullhorn','target','flag','trophy','medal','award','certificate','diploma','graduation','folder','archive','inbox','mail','phone','print','save','undo','redo','expand','compress','window','times','exclamation','question','info','ban','unlock','eye','sort','table','border','square','circle','ellipsis','equal','divide','percentage','trending','line','bar','pie','area','scatter','bubble','radar','polar','doughnut','gauge','speedometer','thermometer','compass','ruler','protractor','triangle','pentagon','hexagon','octagon','diamond','rhombus','trapezoid','parallelogram','kite'].some(keyword => n.includes(keyword)));
      } else if(category === 'brands'){
        items = FONTAWESOME_ICONS.filter(n => ['amazon','apple','google','microsoft','facebook','twitter','instagram','linkedin','youtube','github','reddit','discord','slack','telegram','whatsapp','dropbox','stripe','paypal','visa','mastercard','bitcoin','dribbble','behance','figma','trello','wordpress','medium','chrome','firefox','android','spotify','netflix','adobe','shopify','wix','zoom','skype','docker','aws','gitlab','bitbucket','stackoverflow','codepen','npm','node-js','react','vue','angular','html5','css3','js','python','java','git','webflow'].some(keyword => n.includes(keyword)));
      } else {
        // For 'all' tab, include both FontAwesome icons and custom icons
        items = [...FONTAWESOME_ICONS, ...customIcons.map(icon => `custom:${icon.id}`)];
      }
      
      // Apply search filter
      if(q){
        items = items.filter(n => n.includes(q));
      }
      
      items = items.slice(0, 500);
      
      if(!items.length){ 
        iconGridEl.innerHTML = '<div class="text-sm" style="color:var(--muted)">No icons found</div>'; 
        return; 
      }
      
      const frag = document.createDocumentFragment();
      items.forEach(name=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-tile';
        btn.setAttribute('data-icon', name);
        
        // Handle custom icons
        if(name.startsWith('custom:')){
          const customId = name.replace('custom:', '');
          const customIcon = customIcons.find(icon => icon.id === customId);
          if(customIcon){
            if(customIcon.type === 'image'){
              btn.innerHTML = `
                <div class="custom-icon-container">
                  <img src="${customIcon.data}" />
                  <button class="custom-icon-delete" data-delete-icon="${customId}" title="Delete icon">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              `;
            } else if(customIcon.type === 'glyph'){
              btn.innerHTML = `
                <div class="custom-icon-container">
                  <i class="fa-solid" style="font-family:'Font Awesome 7 Free'; color:inherit;">&#x${customIcon.data};</i>
                  <button class="custom-icon-delete" data-delete-icon="${customId}" title="Delete icon">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              `;
            }
          }
        } else {
        // Use appropriate style - brands use fa-brands, others use fa-solid
        const iconName = name.replace('fa:', '');
          const isBrand = ['amazon','apple','google','microsoft','facebook','twitter','instagram','linkedin','youtube','github','reddit','discord','slack','telegram','whatsapp','dropbox','stripe','paypal','visa','mastercard','bitcoin','dribbble','behance','figma','trello','wordpress','medium','chrome','firefox','android','spotify','netflix','adobe','shopify','wix','zoom','skype','docker','aws','gitlab','bitbucket','stackoverflow','codepen','npm','node-js','react','vue','angular','html5','css3','js','python','java','git','webflow'].includes(iconName);
        const iconClass = isBrand ? 'fa-brands' : 'fa-solid';
        btn.innerHTML = `<i class="${iconClass} fa-${iconName}" style="color:inherit;"></i>`;
        }
        
        btn.addEventListener('click', ()=>{
          if(!iconPickCtx) return;
          const { arr, idx } = iconPickCtx;
          if(name.startsWith('custom:')){
            const customId = name.replace('custom:', '');
            const customIcon = customIcons.find(icon => icon.id === customId);
            if(customIcon){
              if(customIcon.type === 'image'){
                arr[idx].icon = `custom-image:${customIcon.data}`;
              } else if(customIcon.type === 'glyph'){
                arr[idx].icon = `fa-glyph:${customIcon.data}`;
              }
            }
          } else {
          arr[idx].icon = name;
          }
          
          // Use instant save for income rows, regular save for others
          const isIncomeRow = arr === state.income[currentYear] || 
                             Object.values(state.income || {}).some(yearData => yearData === arr);
          if (isIncomeRow && arr[idx]) {
            instantSaveIncomeRow(arr[idx], currentYear);
          } else {
            save();
          }
          
          iconPickerEl.close();
          iconPickCtx = null;
          renderAll();
        });
        frag.appendChild(btn);
      });
      iconGridEl.appendChild(frag);
      
      // Add delete button event listeners for custom icons
      document.querySelectorAll('.custom-icon-delete').forEach(deleteBtn => {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent icon selection
          const customId = deleteBtn.getAttribute('data-delete-icon');
          deleteCustomIcon(customId);
        });
      });
      
      // Update count
      document.getElementById('iconCount').textContent = `Showing ${items.length} icons`;
    }

    iconSearchEl.addEventListener('input', ()=>renderIconPicker(iconSearchEl.value, currentTab));

    let currentTab = 'all';
    document.getElementById('iconTabs').addEventListener('click', (e)=>{
      if(e.target.classList.contains('tab-btn')){
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentTab = e.target.dataset.tab;
        renderIconPicker(iconSearchEl.value, currentTab);
      }
    });

    // Apply glyph button
    document.getElementById('applyGlyph').addEventListener('click', ()=>{
      const unicode = document.getElementById('glyphInput').value.trim();
      if(unicode.length >= 4){
        if(!iconPickCtx) return;
        const { arr, idx } = iconPickCtx;
        const cleanUnicode = unicode.replace(/^\\u/, '');
        arr[idx].icon = `fa-glyph:${cleanUnicode}`;
        
        // Add to custom icons
        addCustomIcon(cleanUnicode, 'glyph', `Glyph ${cleanUnicode}`);
        
        // Use instant save for income rows, regular save for others
        const isIncomeRow = arr === state.income[currentYear] || 
                           Object.values(state.income || {}).some(yearData => yearData === arr);
        if (isIncomeRow && arr[idx]) {
          instantSaveIncomeRow(arr[idx], currentYear);
        } else {
          save();
        }
        
        iconPickerEl.close();
        iconPickCtx = null;
        renderAll();
      }
    });
    
    // Custom image upload functionality
    let customImageData = null;
    
    document.getElementById('uploadCustomImage').addEventListener('click', ()=>{
      document.getElementById('customImageInput').click();
    });
    
    document.getElementById('customImageInput').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e)=>{
        customImageData = e.target.result;
        const imagePreview = document.getElementById('imagePreview');
        const applyBtn = document.getElementById('applyCustomImage');
        
        // Show preview
        imagePreview.innerHTML = `<img src="${customImageData}" style="width:16px; height:16px; object-fit:contain; filter: invert(1);" />`;
        
        applyBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    });
    
    document.getElementById('applyCustomImage').addEventListener('click', async ()=>{
      if (customImageData && iconPickCtx) {
        const { arr, idx } = iconPickCtx;
        




        
        try {
          // Upload image to Supabase

          const imageId = await uploadImageToSupabase(customImageData);

          
          arr[idx].icon = `custom-image:${imageId}`;
        
        // Add to custom icons
          addCustomIcon(imageId, 'image', 'Custom Image');
        
        // Use instant save for income rows, regular save for others
        const isIncomeRow = arr === state.income[currentYear] || 
                           Object.values(state.income || {}).some(yearData => yearData === arr);
        if (isIncomeRow && arr[idx]) {
          instantSaveIncomeRow(arr[idx], currentYear);
        } else {
          save();
        }
        
        iconPickerEl.close();
        iconPickCtx = null;
        renderAll();
          
          showNotification('Image uploaded successfully!', 'success');
        } catch (error) {


          
          // Show specific error message
          if (error.message.includes('storage bucket does not exist')) {
            showNotification('Storage bucket not found. Please create "custom-icons" bucket in Supabase dashboard.', 'error');
          } else if (error.message.includes('custom_icons')) {
            showNotification('Database column not found. Please add "custom_icons" column to user_settings table.', 'error');
          } else {
            showNotification(`Upload failed: ${error.message}`, 'error');
          }
          
          // Fallback to local storage

          arr[idx].icon = `custom-image:${customImageData}`;
          addCustomIcon(customImageData, 'image', 'Custom Image');
          
          const isIncomeRow = arr === state.income[currentYear] || 
                             Object.values(state.income || {}).some(yearData => yearData === arr);
          if (isIncomeRow && arr[idx]) {
            instantSaveIncomeRow(arr[idx], currentYear);
          } else {
            save();
          }
          
          iconPickerEl.close();
          iconPickCtx = null;
          renderAll();
        }
      }
    });

    // Glyph input handler with preview
    const glyphPreview = document.getElementById('glyphPreview');
    document.getElementById('glyphInput').addEventListener('input', (e)=>{
      const unicode = e.target.value.trim();
      if(unicode.length >= 4){
        // Show preview - try different unicode formats
        const unicodeValue = unicode.startsWith('\\u') ? unicode : `\\u${unicode}`;
        const unicodeDecoded = unicodeValue.replace('\\u', '');
        glyphPreview.innerHTML = `<i class="fa-solid" style="font-family:'Font Awesome 7 Free'; font-size:16px;">&#x${unicodeDecoded};</i>`;
      } else {
        glyphPreview.innerHTML = '';
      }
    });

    document.getElementById('glyphInput').addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        const unicode = e.target.value.trim();
        if(unicode.length >= 4){
          if(!iconPickCtx) return;
          const { arr, idx } = iconPickCtx;
          const cleanUnicode = unicode.replace(/^\\u/, '');
          arr[idx].icon = `fa-glyph:${cleanUnicode}`;
          
          // Use instant save for income rows, regular save for others
          const isIncomeRow = arr === state.income[currentYear] || 
                             Object.values(state.income || {}).some(yearData => yearData === arr);
          if (isIncomeRow && arr[idx]) {
            instantSaveIncomeRow(arr[idx], currentYear);
          } else {
            save();
          }
          
          iconPickerEl.close();
          iconPickCtx = null;
          renderAll();
        }
      }
    });

    async function openIconPicker(arr, idx){
      iconPickCtx = { arr, idx };
      iconSearchEl.value = '';
      currentTab = 'all';
      currentStyle = 'solid';
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector('[data-tab="all"]').classList.add('active');
      
      // Clear inputs
      document.getElementById('glyphInput').value = '';
      document.getElementById('glyphPreview').innerHTML = '';
      document.getElementById('customImageInput').value = '';
      document.getElementById('imagePreview').innerHTML = '';
      document.getElementById('applyCustomImage').disabled = true;
      customImageData = null;
      
      // Show current icon in unicode input and preview
      const currentIcon = arr[idx]?.icon;
      if (currentIcon) {
        if (currentIcon.startsWith('fa-glyph:')) {
          const unicode = currentIcon.replace('fa-glyph:', '');
          document.getElementById('glyphInput').value = unicode;
          document.getElementById('glyphPreview').innerHTML = `<i class="fa-solid" style="font-family:'Font Awesome 7 Free'; color:inherit;">&#x${unicode};</i>`;
        } else if (currentIcon.startsWith('custom-image:')) {
          const imageData = currentIcon.replace('custom-image:', '');
          document.getElementById('imagePreview').innerHTML = `<img src="${imageData}" style="width:16px; height:16px; object-fit:contain; filter: invert(1);" />`;
          document.getElementById('applyCustomImage').disabled = false;
        }
      }
      
      // Load custom icons from Supabase
      await loadCustomIconsFromSupabase();
      
      ensureFontAwesomeLoaded().then(()=>{ renderIconPicker('', 'all'); iconPickerEl.showModal(); });
    }

    function renderList(containerId, arr, isBiz){
      const wrap=document.getElementById(containerId); wrap.innerHTML='';
      
      // Sort array by order property before rendering
      const sortedArr = [...arr].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        return orderA - orderB;
      });
      
      sortedArr.forEach((row,idx)=>{
        const mUSD=rowMonthlyUSD(row), yUSD=rowYearlyUSD(row), mEGP=usdToEgp(mUSD), yEGP=usdToEgp(yUSD);
        const mSelected=usdToSelectedCurrency(mUSD), ySelected=usdToSelectedCurrency(yUSD);
        const div=document.createElement('div'); 
        div.className=isBiz?'row row-biz row-draggable row-drop-zone':'row row-draggable row-drop-zone';
        div.setAttribute('data-row-index', idx);
        div.setAttribute('draggable', 'true');
        
        // drag handle cell
        const dragHandleDiv=document.createElement('div'); 
        dragHandleDiv.className='drag-handle';
        dragHandleDiv.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M8 6h8M8 12h8M8 18h8"/></svg>';
        dragHandleDiv.title='Drag to reorder';
        
        // icon cell
        const iconName = row.icon || (isBiz ? 'fa:briefcase' : 'fa:shopping-cart');
        let iconHTML = '';
        if(iconName.startsWith('custom-image:')){
          const imageData = iconName.replace('custom-image:', '');
          iconHTML = `<img src="${imageData}" class="custom-svg-icon" onload="applySmartSVGInversion(this)" />`;
        } else if(iconName.startsWith('fa-glyph:')){
          const unicode = iconName.replace('fa-glyph:', '');
          iconHTML = `<i class="fa-solid" style="font-family:'Font Awesome 7 Free'; color:inherit;">&#x${unicode};</i>`;
        } else {
          const cleanIconName = iconName.replace(/^(fa-solid|fa-regular|fa:)/, '');
          const isBrand = ['amazon','apple','google','microsoft','facebook','twitter','instagram','linkedin','youtube','github','reddit','discord','slack','telegram','whatsapp','dropbox','stripe','paypal','visa','mastercard','bitcoin','dribbble','behance','figma','trello','wordpress','medium','chrome','firefox','android','spotify','netflix','adobe','shopify','wix','zoom','skype','docker','aws','gitlab','bitbucket','stackoverflow','codepen','npm','node-js','react','vue','angular','html5','css3','js','python','java','git','webflow'].includes(cleanIconName);
          const iconClass = isBrand ? 'fa-brands' : 'fa-solid';
          iconHTML = `<i class="${iconClass} fa-${cleanIconName}" style="color:inherit;"></i>`;
        }
        const iconDiv=document.createElement('div'); iconDiv.className='icon-cell';
        iconDiv.innerHTML=`<button type="button" title="Change icon" data-choose-icon>\
          ${iconHTML}\
        </button>`;
        // name & inputs
         const nameDiv=document.createElement('div'); 
         const nameInput = document.createElement('input');
         nameInput.className = 'input';
         nameInput.type = 'text';
         nameInput.value = row.name || '';
         nameInput.placeholder = 'Item name';
         nameInput.addEventListener('input', function() {
           row.name = this.value;
           save('name-input');
         });
         nameDiv.appendChild(nameInput);
         
         const costDiv=document.createElement('div'); 
         const costInput = document.createElement('input');
         costInput.className = 'input cost-input';
         costInput.type = 'number';
         costInput.step = '0.01';
         costInput.value = (row.cost || 0).toFixed(2);
         costInput.addEventListener('input', function() {
           row.cost = Number(this.value) || 0;
           save('cost-input');
          // Live calculations as you type
           updateRowCalculations(div, row, isBiz);
           // KPIs will be updated by updateRowCalculations
         });
         costDiv.innerHTML = '<div class="cost-input-wrapper"></div>';
         const wrapper = costDiv.querySelector('.cost-input-wrapper');
         
         // Add dollar sign display BEFORE the input
         const dollarDisplay = document.createElement('span');
         dollarDisplay.className = 'cost-dollar-display';
         dollarDisplay.textContent = '$';
         wrapper.appendChild(dollarDisplay);
         
         wrapper.appendChild(costInput);
         
         const statusDiv=document.createElement('div'); 
         const statusToggle = document.createElement('div');
         statusToggle.className = 'toggle-switch status-' + (row.status === 'Active' ? 'active' : 'cancelled');
         
         const statusSlider = document.createElement('div');
         statusSlider.className = 'toggle-slider';
         
         const statusText = document.createElement('div');
         statusText.className = 'toggle-text';
         statusText.textContent = row.status === 'Active' ? 'ON' : 'OFF';
         
        statusSlider.appendChild(statusText);
        statusToggle.appendChild(statusSlider);
         
         statusToggle.addEventListener('click', function(e) {
           e.preventDefault();
           e.stopPropagation();
           
           // Toggle status
           if (row.status === 'Active') {
             row.status = 'Cancelled';
             statusToggle.className = 'toggle-switch status-cancelled';
             statusText.textContent = 'OFF';
           } else {
             row.status = 'Active';
             statusToggle.className = 'toggle-switch status-active';
             statusText.textContent = 'ON';
           }
           
           save('status-toggle');
           updateRowCalculations(div, row, isBiz);
           // KPIs will be updated by updateRowCalculations
         });
         
         statusDiv.appendChild(statusToggle);
         
         const billingDiv=document.createElement('div'); 
         const billingToggle = document.createElement('div');
         billingToggle.className = 'toggle-switch billing-' + (row.billing === 'Monthly' ? 'monthly' : 'annually');
         
         const billingSlider = document.createElement('div');
         billingSlider.className = 'toggle-slider';
         
         const billingText = document.createElement('div');
         billingText.className = 'toggle-text';
         billingText.textContent = row.billing === 'Monthly' ? 'M' : 'Y';
         
        billingSlider.appendChild(billingText);
        billingToggle.appendChild(billingSlider);
         
         billingToggle.addEventListener('click', function(e) {
           e.preventDefault();
           e.stopPropagation();
           
          // Toggle billing
          if (row.billing === 'Monthly') {
            row.billing = 'Annually';
            billingToggle.className = 'toggle-switch billing-annually';
            billingText.textContent = 'Y';
          } else {
            row.billing = 'Monthly';
            billingToggle.className = 'toggle-switch billing-monthly';
            billingText.textContent = 'M';
          }
           
           save('billing-toggle');
           updateRowCalculations(div, row, isBiz);
           // KPIs will be updated by updateRowCalculations
         });
         
         billingDiv.appendChild(billingToggle);
         
         
        div.append(dragHandleDiv,iconDiv,nameDiv,costDiv,statusDiv,billingDiv);
        if(isBiz){ 
          const dateDiv=document.createElement('div'); 
          dateDiv.style.position = 'relative';
          // Create a container for the date display
          const dateContainer = document.createElement('div');
          dateContainer.className = 'next-date-container';
          dateContainer.style.cssText = 'display: flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; color: var(--muted);';
          
          // Create the date input (hidden by default)
          const dateInput = document.createElement('input');
          dateInput.className = 'input date-input-minimal';
          dateInput.type = 'date';
          dateInput.value = row.next || '';
          dateInput.style.display = 'none';
          
          // Create display element
          const dateDisplay = document.createElement('span');
          dateDisplay.className = 'next-date-display';
          dateDisplay.style.cssText = 'cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 4px; transition: all 0.2s ease;';
          
          // Function to update display
          const updateDateDisplay = () => {
            if (row.next) {
              dateDisplay.textContent = formatDateForDisplay(row.next);
              dateDisplay.style.color = 'var(--fg)';
              dateDisplay.style.backgroundColor = 'var(--hover)';
            } else {
              dateDisplay.textContent = 'Set date';
              dateDisplay.style.color = 'var(--muted)';
              dateDisplay.style.backgroundColor = 'transparent';
            }
          };
          
          // Initial display update
          updateDateDisplay();
          
          // Click to edit
          dateDisplay.addEventListener('click', () => {
            dateInput.style.display = 'block';
            dateDisplay.style.display = 'none';
            dateInput.focus();
          });
          
          // Save and hide input
          dateInput.addEventListener('change', function() {
            row.next = this.value;
            this.style.display = 'none';
            dateDisplay.style.display = 'block';
            updateDateDisplay();
            save('date-input');
            renderKPIs(); // Update KPIs for renewal analytics
          });
          
          // Hide input on blur if no change
          dateInput.addEventListener('blur', function() {
            setTimeout(() => {
              this.style.display = 'none';
              dateDisplay.style.display = 'block';
            }, 100);
          });
          
          dateContainer.appendChild(dateDisplay);
          dateContainer.appendChild(dateInput);
          dateDiv.appendChild(dateContainer);
          div.appendChild(dateDiv); 
        }
        // computed columns - all editable with clean formatting and always-visible symbols
        const mUSDd=document.createElement('div'); 
        mUSDd.className='financial-input-wrapper'; 
        mUSDd.innerHTML='<span class="financial-symbol">$</span><span class="financial-value">' + Math.round(mUSD).toLocaleString() + '</span>';
        mUSDd.setAttribute('data-field', 'monthlyUSD');
        mUSDd.setAttribute('data-row-index', idx);
        mUSDd.setAttribute('data-type', 'usd');
        mUSDd.setAttribute('data-original', Math.round(mUSD));
        mUSDd.addEventListener('click', function() { makeEditable(this, row, isBiz, div); });
        
        const yUSDd=document.createElement('div'); 
        yUSDd.className='financial-input-wrapper'; 
        yUSDd.innerHTML='<span class="financial-symbol">$</span><span class="financial-value">' + Math.round(yUSD).toLocaleString() + '</span>';
        yUSDd.setAttribute('data-field', 'yearlyUSD');
        yUSDd.setAttribute('data-row-index', idx);
        yUSDd.setAttribute('data-type', 'usd');
        yUSDd.setAttribute('data-original', Math.round(yUSD));
        yUSDd.addEventListener('click', function() { makeEditable(this, row, isBiz, div); });
        
        const mEGPd=document.createElement('div'); 
        mEGPd.className='financial-input-wrapper'; 
        mEGPd.innerHTML='<span class="financial-symbol">' + state.currencySymbol + '</span><span class="financial-value">' + Math.round(mSelected).toLocaleString() + '</span>';
        mEGPd.setAttribute('data-field', 'monthlyEGP');
        mEGPd.setAttribute('data-row-index', idx);
        mEGPd.setAttribute('data-type', 'egp');
        mEGPd.setAttribute('data-original', Math.round(mSelected));
        mEGPd.addEventListener('click', function() { makeEditable(this, row, isBiz, div); });
        
        const yEGPd=document.createElement('div'); 
        yEGPd.className='financial-input-wrapper'; 
        yEGPd.innerHTML='<span class="financial-symbol">' + state.currencySymbol + '</span><span class="financial-value">' + Math.round(ySelected).toLocaleString() + '</span>';
        yEGPd.setAttribute('data-field', 'yearlyEGP');
        yEGPd.setAttribute('data-row-index', idx);
        yEGPd.setAttribute('data-type', 'egp');
        yEGPd.setAttribute('data-original', Math.round(ySelected));
        yEGPd.addEventListener('click', function() { makeEditable(this, row, isBiz, div); });
        div.append(mUSDd,yUSDd,mEGPd,yEGPd);
        // delete
        const del=document.createElement('div'); 
        del.innerHTML='<button class="delete-btn" data-del aria-label="Delete">\
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M7 9h10M9 9v8m6-8v8M5 6h14l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6Zm3-3h8l1 3H7l1-3Z"/></svg></button>';
        div.appendChild(del);

        // wire inputs - event listeners already added above, no need to add them again
        // Note: Event listeners for nameInput and costInput are already bound above in lines 5241-5259
        if(isBiz){ const dateInp=div.querySelector('input[type="date"]'); if(dateInp){ dateInp.addEventListener('change', ()=>{ row.next=dateInp.value; save('date-input'); }); } }
        const iconBtn=iconDiv.querySelector('[data-choose-icon]');
        iconBtn.addEventListener('click', async ()=> await openIconPicker(arr, idx));
        const delBtn=del.querySelector('[data-del]'); 
        delBtn.addEventListener('click', async ()=>{ 
          if(delBtn.classList.contains('delete-confirm')){
            // If the row has an ID, delete it from Supabase first
            if (row.id && currentUser && supabaseReady) {
              const tableName = isBiz ? 'business_expenses' : 'personal_expenses';
              const { error } = await window.supabaseClient
                .from(tableName)
                .delete()
                .eq('id', row.id);
              
              if (error) {

                showNotification(`Failed to delete ${isBiz ? 'business' : 'personal'} expense`, 'error', 2000);
                return; // Don't delete locally if Supabase delete failed
              } else {

                showNotification(`🗑️ ${isBiz ? 'Business' : 'Personal'} expense deleted`, 'success', 1500, { force: true });
              }
            }
            
            // Remove from local state
            arr.splice(idx,1); 
            
            // Update order properties for remaining rows
            arr.forEach((row, index) => {
              row.order = index;
            });
            
            saveToLocal(); // Save locally as well
            renderAll();
          } else {
            delBtn.classList.add('delete-confirm');
            delBtn.innerHTML = 'Sure?';
            setTimeout(()=>{
              delBtn.classList.remove('delete-confirm');
              delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M7 9h10M9 9v8m6-8v8M5 6h14l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6Zm3-3h8l1 3H7l1-3Z"/></svg>';
            }, 3000);
          }
        });
        // Removed auto-add row on Enter key to prevent unwanted row creation

      wrap.appendChild(div);
    });

      // sums
      const sumEl=document.getElementById(containerId==='list-personal'?'sum-personal':'sum-biz');
      const t=totals(arr);
      let sumHTML='';
      // drag handle column
      sumHTML += '<div></div>';
      // icon column (present for both personal and biz)
      sumHTML += '<div></div>';
      // label
      sumHTML += '<div class="font-medium" style="color:var(--muted)">Totals</div>';
      // spacer columns before computed values (Cost USD, Status, Billing, Next for Biz)
      if(isBiz){ sumHTML += '<div></div><div></div><div></div><div></div>'; } // Cost, Status, Billing, Next
      else { sumHTML += '<div></div><div></div><div></div>'; } // Cost, Status, Billing
      // computed sum cells
      sumHTML += '<div class="font-semibold">$'+nfINT.format(t.mUSD)+'</div>';
      sumHTML += '<div class="font-semibold">$'+nfINT.format(t.yUSD)+'</div>';
      sumHTML += '<div class="font-semibold">'+state.currencySymbol+' '+nfINT.format(Math.round(t.mSelected))+'</div>';
      sumHTML += '<div class="font-semibold">'+state.currencySymbol+' '+nfINT.format(Math.round(t.ySelected))+'</div>';
      // delete column spacer
      sumHTML += '<div></div>';
      sumEl.innerHTML=sumHTML;
    }


  // Function to save income order to cloud
  async function saveIncomeOrderToCloud(sortedArr, year) {
    if (!currentUser || !supabaseReady) return;
    
    try {
      // Update order for all rows in the current year
      const updates = sortedArr.map((row, index) => ({
        id: row.id,
        order: index
      })).filter(update => update.id); // Only include rows with IDs
      
      if (updates.length === 0) return;
      
      // Batch update order property
      for (const update of updates) {
        await window.supabaseClient
          .from('income')
          .update({ order: update.order })
          .eq('id', update.id);
      }
      
      console.log(`✅ Updated order for ${updates.length} income rows`);
    } catch (error) {
      console.error('❌ Failed to update income order:', error);
    }
  }

  function renderIncomeList(containerId, arr) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = '';
    
    // Sort array by date (oldest to newest) before rendering
    const sortedArr = [...arr].sort((a, b) => {
      const dateA = new Date(a.date || '1900-01-01');
      const dateB = new Date(b.date || '1900-01-01');
      return dateA - dateB; // Oldest first
    });
    
    // Update order property based on date sorting for cloud sync
    sortedArr.forEach((row, index) => {
      row.order = index;
    });
    
    // Save updated order to cloud if user is authenticated
    if (currentUser && supabaseReady && sortedArr.length > 0) {
      saveIncomeOrderToCloud(sortedArr, currentYear);
    }
    
    sortedArr.forEach((row, idx) => {
      const mUSD = rowIncomeMonthlyUSD(row);
      const yUSD = rowIncomeYearlyUSD(row);
      const mEGP = usdToEgp(mUSD);
      const yEGP = usdToEgp(yUSD);
      const mSelected = usdToSelectedCurrency(mUSD);
      const ySelected = usdToSelectedCurrency(yUSD);
      
      const div = document.createElement('div');
      div.className = 'row row-income';
      div.setAttribute('data-row-index', idx);
      div.__rowData = row; // Store row data for tag system
      
      // Empty space where drag handle used to be (for consistent layout)
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-space';
      emptyDiv.style.width = '20px';
      emptyDiv.style.height = '100%';
      
      // Icon cell
      const iconName = row.icon || 'fa:dollar-sign';
      let iconHTML = '';
      if (iconName.startsWith('custom-image:')) {
        const imageData = iconName.replace('custom-image:', '');
        iconHTML = `<img src="${imageData}" class="custom-svg-icon" onload="applySmartSVGInversion(this)" />`;
      } else if (iconName.startsWith('fa-glyph:')) {
        const unicode = iconName.replace('fa-glyph:', '');
        iconHTML = `<i class="fa-solid" style="font-family:'Font Awesome 7 Free'; color:inherit;">&#x${unicode};</i>`;
      } else {
        const cleanIconName = iconName.replace(/^(fa-solid|fa-regular|fa:)/, '');
        const isBrand = ['amazon','apple','google','microsoft','facebook','twitter','instagram','linkedin','youtube','github','reddit','discord','slack','telegram','whatsapp','dropbox','stripe','paypal','visa','mastercard','bitcoin','dribbble','behance','figma','trello','wordpress','medium','chrome','firefox','android','spotify','netflix','adobe','shopify','wix','zoom','skype','docker','aws','gitlab','bitbucket','stackoverflow','codepen','npm','node-js','react','vue','angular','html5','css3','js','python','java','git','webflow'].includes(cleanIconName);
        const iconClass = isBrand ? 'fa-brands' : 'fa-solid';
        iconHTML = `<i class="${iconClass} fa-${cleanIconName}" style="color:inherit;"></i>`;
      }
      const iconDiv = document.createElement('div');
      iconDiv.className = 'icon-cell';
      iconDiv.innerHTML = `<button type="button" title="Change icon" data-choose-icon>${iconHTML}</button>`;
      
      // Name input
      const nameDiv = document.createElement('div');
      const nameInput = document.createElement('input');
      nameInput.className = 'input';
      nameInput.type = 'text';
      nameInput.value = row.name || '';
      nameInput.placeholder = 'Project name';
      nameInput.style.fontSize = '0.7rem';
      nameInput.style.padding = '0.4rem 0.6rem';
      nameInput.style.borderRadius = '8px';
      nameInput.addEventListener('input', function() {

        row.name = this.value;
        saveInputValue('projectName', this.value);
        instantSaveIncomeRow(row, currentYear);
      });
      addAutocompleteToInput(nameInput, 'projectName');
      nameDiv.appendChild(nameInput);
      
      // Modern Tags input with selection system
      const tagsDiv = document.createElement('div');
      const tagsWrapper = document.createElement('div');
      tagsWrapper.className = 'tag-input-wrapper';
      
      // Create chips for existing tags
      const existingTags = (row.tags || '').split(',').filter(tag => tag.trim());
      existingTags.forEach(tag => {
        const chip = createTagChip(tag.trim());
        tagsWrapper.appendChild(chip);
      });
      
      const tagsInput = document.createElement('input');
      tagsInput.className = 'tag-input';
      tagsInput.type = 'text';
      tagsInput.placeholder = '';
      tagsInput.addEventListener('input', function() {
        handleTagInput(this, tagsWrapper, row);
        instantSaveIncomeRow(row, currentYear); // Instant save when tags are modified
      });
      tagsInput.addEventListener('keydown', function(e) {
        handleTagKeydown(e, this, tagsWrapper, row);
      });
      tagsInput.addEventListener('focus', function() {
        showTagSuggestions(this, tagsWrapper);
      });
      tagsInput.addEventListener('blur', function() {
        setTimeout(() => hideTagSuggestions(tagsWrapper), 150);
      });
      
      // Store row reference for tag system
      tagsWrapper.__rowData = row;
      
      tagsWrapper.appendChild(tagsInput);
      tagsDiv.appendChild(tagsWrapper);
      
      // Date input (month and day only, with current year)
      const dateDiv = document.createElement('div');
      dateDiv.style.position = 'relative';
      
      const dateInput = document.createElement('input');
      dateInput.className = 'input date-input-minimal';
      dateInput.type = 'date';
      dateInput.placeholder = 'MM-DD';
      dateInput.style.fontSize = '0.75rem';
      dateInput.style.padding = '0.5rem 0.75rem';
      dateInput.style.borderRadius = '8px';
      
      // Set value with current year if no date exists
      if (row.date) {
        dateInput.value = row.date;
      } else {
        // Set to current year with today's month and day
        const today = new Date();
        const year = parseInt(currentYear) || today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        row.date = dateInput.value;
      }
      
      dateInput.addEventListener('change', function() {
        // Ensure the year is set to current year
        const selectedDate = new Date(this.value);
        const year = parseInt(currentYear) || new Date().getFullYear();
        selectedDate.setFullYear(year);
        const finalYear = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const fullDate = `${finalYear}-${month}-${day}`;
        
        row.date = fullDate;
        this.value = fullDate;
        instantSaveIncomeRow(row, currentYear);
        // Trigger live KPI updates when date changes (affects monthly/yearly calculations)
        updateIncomeKPIsLive();
      });
      dateDiv.appendChild(dateInput);
      
      
      // All Payment input
      const allPaymentDiv = document.createElement('div');
      const allPaymentInput = document.createElement('input');
      allPaymentInput.className = 'input cost-input';
      allPaymentInput.type = 'number';
      allPaymentInput.step = '0.01';
      allPaymentInput.value = (row.allPayment || 0).toFixed(2);
      allPaymentInput.placeholder = 'Total $';
      allPaymentInput.style.fontSize = '0.75rem';
      allPaymentInput.style.padding = '0.5rem 0.75rem';
      allPaymentInput.style.borderRadius = '8px';
      allPaymentInput.addEventListener('input', function() {

        row.allPayment = Number(this.value) || 0;
        instantSaveIncomeRow(row, currentYear);
        updateIncomeRowCalculations(div, row);
        // Live KPI updates are already handled in updateIncomeRowCalculations
      });
      allPaymentDiv.innerHTML = '<div class="cost-input-wrapper"></div>';
      const allPaymentWrapper = allPaymentDiv.querySelector('.cost-input-wrapper');
      const allPaymentDollarDisplay = document.createElement('span');
      allPaymentDollarDisplay.className = 'cost-dollar-display';
      allPaymentDollarDisplay.textContent = '$';
      allPaymentWrapper.appendChild(allPaymentDollarDisplay);
      allPaymentWrapper.appendChild(allPaymentInput);
      
      // Paid USD input
      const paidUsdDiv = document.createElement('div');
      const paidUsdInput = document.createElement('input');
      paidUsdInput.className = 'input cost-input';
      paidUsdInput.type = 'number';
      paidUsdInput.step = '0.01';
      paidUsdInput.value = (row.paidUsd || 0).toFixed(2);
      paidUsdInput.placeholder = 'Paid $';
      paidUsdInput.style.fontSize = '0.75rem';
      paidUsdInput.style.padding = '0.5rem 0.75rem';
      paidUsdInput.style.borderRadius = '8px';
      paidUsdInput.addEventListener('input', function() {

        row.paidUsd = Number(this.value) || 0;
        instantSaveIncomeRow(row, currentYear);
        updateIncomeRowCalculations(div, row);
        // Live KPI updates are already handled in updateIncomeRowCalculations
      });
      paidUsdDiv.innerHTML = '<div class="cost-input-wrapper"></div>';
      const paidUsdWrapper = paidUsdDiv.querySelector('.cost-input-wrapper');
      const paidUsdDollarDisplay = document.createElement('span');
      paidUsdDollarDisplay.className = 'cost-dollar-display';
      paidUsdDollarDisplay.textContent = '$';
      paidUsdWrapper.appendChild(paidUsdDollarDisplay);
      paidUsdWrapper.appendChild(paidUsdInput);
      
      // Paid EGP (calculated)
      const paidEgpDiv = document.createElement('div');
      paidEgpDiv.className = 'paid-egp-cell editable-value';
      const paidEgpValue = row.paidEgp || (row.paidUsd || 0) * state.fx;
      const paidSelectedValue = usdToSelectedCurrency(row.paidUsd || 0);
      paidEgpDiv.textContent = state.currencySymbol + ' ' + nfINT.format(Math.round(paidSelectedValue));
      paidEgpDiv.setAttribute('data-field', 'paidEgp');
      paidEgpDiv.setAttribute('data-row-id', row.id || '');
      paidEgpDiv.setAttribute('data-year', currentYear);
      
      // Method select - minimal modern design
      const methodDiv = document.createElement('div');
      const methodDropdown = document.createElement('div');
      methodDropdown.className = 'method-dropdown-minimal';
      
      const methodTrigger = document.createElement('button');
      methodTrigger.className = 'method-trigger-minimal';
      methodTrigger.innerHTML = `
        <span class="method-text">${row.method || 'Bank Transfer'}</span>
        <svg class="method-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      `;
      
      const methodMenu = document.createElement('div');
      methodMenu.className = 'method-menu-minimal';
      
      // Add custom input section at the top
      const customInputSection = document.createElement('div');
      customInputSection.className = 'method-custom-section';
      customInputSection.style.cssText = 'padding: 0.5rem; border-bottom: 1px solid var(--stroke); margin-bottom: 0.25rem;';
      
      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.placeholder = 'Add custom method...';
      customInput.className = 'method-custom-input';
      customInput.style.cssText = 'width: 100%; padding: 0.25rem 0.5rem; font-size: 0.7rem; border: 1px solid var(--stroke); border-radius: 4px; background: var(--card); color: var(--fg); outline: none;';
      
      customInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = this.value.trim();
          if (value) {
            addCustomMethodOption(value);
            this.value = '';
            // Refresh the dropdown
            refreshMethodDropdown();
          }
        }
      });
      
      // Function to refresh the entire dropdown
      const refreshMethodDropdown = () => {
        methodMenu.innerHTML = '';
        methodMenu.appendChild(customInputSection);
        renderMethodOptions(methodMenu, row, methodDropdown);
      };
      
      customInputSection.appendChild(customInput);
      methodMenu.appendChild(customInputSection);
      
      // Function to render method options
      const renderMethodOptions = (container, rowData, dropdown) => {
        const options = getAllMethodOptions();
        const customOptions = getCustomMethodOptions();
        
      options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'method-item-minimal';
          item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; cursor: pointer; transition: all 0.2s ease;';
          
          if (option === (rowData.method || 'Bank Transfer')) {
          item.classList.add('selected');
        }
          
          const itemText = document.createElement('span');
          itemText.textContent = option;
          itemText.style.flex = '1';
          
          item.appendChild(itemText);
          
          // Add remove button for custom options only
          if (customOptions.includes(option)) {
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.className = 'method-remove-btn';
            removeBtn.style.cssText = 'background: none; border: none; color: var(--muted); cursor: pointer; padding: 0.125rem 0.25rem; border-radius: 2px; font-size: 0.8rem; margin-left: 0.5rem; transition: all 0.2s ease;';
            removeBtn.title = 'Remove this option';
            
            removeBtn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              removeCustomMethodOption(option);
              // Refresh the dropdown
              refreshMethodDropdown();
            });
            
            removeBtn.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'var(--hover)';
              this.style.color = 'var(--fg)';
            });
            
            removeBtn.addEventListener('mouseleave', function() {
              this.style.backgroundColor = 'transparent';
              this.style.color = 'var(--muted)';
            });
            
            item.appendChild(removeBtn);
          }
          
        item.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
            rowData.method = option;
          methodTrigger.querySelector('.method-text').textContent = option;
          methodMenu.querySelectorAll('.method-item-minimal').forEach(i => i.classList.remove('selected'));
          this.classList.add('selected');
          methodDropdown.classList.remove('open');
          methodMenu.classList.remove('show');
            instantSaveIncomeRow(rowData, currentYear);
        });
          
          container.appendChild(item);
      });
      };
      
      // Initial render
      renderMethodOptions(methodMenu, row, methodDropdown);
      
      methodTrigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other dropdowns first
        document.querySelectorAll('.method-dropdown-minimal.open').forEach(dd => {
          if (dd !== methodDropdown) {
            dd.classList.remove('open');
            const menu = dd.querySelector('.method-menu-minimal');
            if (menu) {
              menu.classList.remove('show');
              menu.remove(); // Remove from document.body
            }
          }
        });
        
        methodDropdown.classList.toggle('open');
        
        if (methodMenu.classList.contains('show')) {
          methodMenu.classList.remove('show');
        } else {
          // Position dropdown based on available space
          positionDropdown(methodTrigger, methodMenu);
          methodMenu.classList.add('show');
        }
      });
      
      methodDropdown.appendChild(methodTrigger);
      methodDropdown.appendChild(methodMenu);
      methodDiv.appendChild(methodDropdown);
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!methodDropdown.contains(e.target)) {
          methodDropdown.classList.remove('open');
          methodMenu.classList.remove('show');
        }
      });
      
      
      // Delete button
      const deleteDiv = document.createElement('div');
      deleteDiv.innerHTML = '<button class="delete-btn" data-del aria-label="Delete">\
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M7 9h10M9 9v8m6-8v8M5 6h14l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6Zm3-3h8l1 3H7l1-3Z"/></svg></button>';
      
      const delBtn = deleteDiv.querySelector('[data-del]');
      delBtn.addEventListener('click', function() {
        if (delBtn.classList.contains('delete-confirm')) {
          // If the row has an ID, delete it from Supabase
          if (row.id && currentUser && supabaseReady) {
            window.supabaseClient
              .from('income')
              .delete()
              .eq('id', row.id)
              .then(({ error }) => {
                if (error) {

                  showNotification('Failed to delete income', 'error', 2000);
                } else {

                  showNotification('🗑️ Income deleted', 'success', 1500, { force: true });
                }
              });
          }
          arr.splice(idx, 1);
          
          // Update order properties for remaining rows
          arr.forEach((row, index) => {
            row.order = index;
          });
          
          saveToLocal(); // Save locally as well
          renderAll();
          // Trigger live KPI updates when income row is deleted
          updateIncomeKPIsLive();
        } else {
          delBtn.classList.add('delete-confirm');
          delBtn.innerHTML = 'Confirm';
          setTimeout(() => {
            delBtn.classList.remove('delete-confirm');
            delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M7 9h10M9 9v8m6-8v8M5 6h14l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6Zm3-3h8l1 3H7l1-3Z"/></svg>';
          }, 3000);
        }
      });
      
      // Add icon picker event listener
      const iconBtn = iconDiv.querySelector('[data-choose-icon]');
      iconBtn.addEventListener('click', async () => await openIconPicker(arr, idx));
      
      // Append all cells
      div.appendChild(emptyDiv);
      div.appendChild(iconDiv);
      div.appendChild(nameDiv);
      div.appendChild(tagsDiv);
      div.appendChild(dateDiv);
      div.appendChild(allPaymentDiv);
      div.appendChild(paidUsdDiv);
      div.appendChild(paidEgpDiv);
      
      // Add click event listener for PAID EGP editing
      paidEgpDiv.addEventListener('click', function() {
        if (this.classList.contains('editing')) return;
        
        this.classList.add('editing');
        const currentValue = row.paidEgp || (row.paidUsd || 0) * state.fx;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = Math.round(currentValue);
        input.className = 'editable-input';
        input.style.textAlign = 'left';
        input.style.padding = '0.25rem 0.5rem';
        input.style.fontSize = '0.65rem';
        input.style.minWidth = '60px';
        
        const originalContent = this.textContent;
        this.textContent = '';
        this.appendChild(input);
        input.focus();
        input.select();
        
        const saveEdit = () => {
          const newValue = parseFloat(input.value) || 0;
          row.paidEgp = newValue;
          
          // Update the state as well
          const year = currentYear;
          const stateRowIndex = (state.income[year] || []).findIndex(stateRow => 
            stateRow.id === row.id || 
            (stateRow.name === row.name && stateRow.date === row.date)
          );
          
          if (stateRowIndex !== -1) {
            state.income[year][stateRowIndex].paidEgp = newValue;
          }
          
          // Update the display
          this.textContent = 'EGP ' + nfINT.format(Math.round(newValue));
          this.classList.remove('editing');
          
          // Save to cloud using direct save, with fallback to local save
          try {
            saveIncomeRowDirectly(row, currentYear);
          } catch (error) {

            saveToLocal();
            showNotification('Saved locally (cloud sync failed)', 'warning', 2000);
          }
        };
        
        const cancelEdit = () => {
          this.textContent = originalContent;
          this.classList.remove('editing');
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
        });
      });
      div.appendChild(methodDiv);
      div.appendChild(deleteDiv);
      
      wrap.appendChild(div);
    });
    
    // Update income sum
    const sumEl = document.getElementById('sum-income');
    if (sumEl) {
      const totalAllPayment = arr.reduce((sum, r) => sum + (Number(r.allPayment) || 0), 0);
      const totalPaidUsd = arr.reduce((sum, r) => sum + (Number(r.paidUsd) || 0), 0);
      const totalPaidEgp = totalPaidUsd * state.fx;
      const totalPaidSelected = usdToSelectedCurrency(totalPaidUsd);
      
      let sumHTML = '';
      sumHTML += '<div></div>'; // empty space (was drag handle)
      sumHTML += '<div></div>'; // icon
      sumHTML += '<div style="font-weight: 600;">Total</div>'; // project name
      sumHTML += '<div></div>'; // tags
      sumHTML += '<div></div>'; // date
      sumHTML += `<div class="font-semibold">$${nfINT.format(totalAllPayment)}</div>`; // all payment
      sumHTML += `<div class="font-semibold">$${nfINT.format(totalPaidUsd)}</div>`; // paid usd
      sumHTML += `<div class="font-semibold">${state.currencySymbol} ${nfINT.format(Math.round(totalPaidSelected))}</div>`; // paid selected currency
      sumHTML += '<div></div>'; // method
      sumHTML += '<div></div>'; // delete
      sumEl.innerHTML = sumHTML;
    }
    
    // Apply lock state to newly rendered income rows
    updateInputsLockState();
  }
  
  function updateIncomeRowCalculations(rowEl, row) {
    const paidEgp = row.paidEgp || (row.paidUsd || 0) * state.fx;
    
    const paidEgpCell = rowEl.querySelector('.paid-egp-cell');
    
    if (paidEgpCell) paidEgpCell.textContent = 'EGP ' + nfINT.format(Math.round(paidEgp));
    
    // Trigger live KPI updates when income data changes
    updateIncomeKPIsLive();
  }

  // Live income KPI updates function
  function updateIncomeKPIsLive() {
    const currentYearData = state.income[currentYear] || [];
    const i = incomeTotals(currentYearData);
    const lifetimeIncome = lifetimeIncomeTotals();
    
    // Update current year income KPIs
    setText('kpiIncomeMonthlyCurrent', nfUSD.format(i.mUSD));
    setText('kpiIncomeMonthlyCurrentEGP', formatCurrency(i.mSelected));
    setText('kpiIncomeYearlyCurrent', nfUSD.format(i.yUSD));
    setText('kpiIncomeYearlyCurrentEGP', formatCurrency(i.ySelected));
    
    // Update lifetime income KPIs
    setText('kpiIncomeAllMonthlyUSD', nfUSD.format(lifetimeIncome.monthlyUSD));
    setText('kpiIncomeAllMonthlyEGP', formatCurrency(lifetimeIncome.monthlySelected));
    setText('kpiIncomeAllYearlyUSD', nfUSD.format(lifetimeIncome.yearlyUSD));
    setText('kpiIncomeAllYearlyEGP', formatCurrency(lifetimeIncome.yearlySelected));
    
    // Update average calculations
    setText('kpiIncomeMonthlyAvg', nfUSD.format(lifetimeIncome.monthlyUSD));
    setText('kpiIncomeMonthlyAvgEGP', formatCurrency(lifetimeIncome.monthlySelected));
    
    // Update yearly target (20% above lifetime)
    setText('kpiIncomeYearlyTarget', nfUSD.format(lifetimeIncome.yearlyUSD * 1.2));
    setText('kpiIncomeYearlyTargetEGP', formatCurrency(lifetimeIncome.yearlySelected * 1.2));
    
    // Update lifetime income breakdown
    setText('shareIncomeCompletedVal', nfUSD.format(lifetimeIncome.totalUSD));
    setText('shareIncomePendingVal', lifetimeIncome.totalEntries.toString());
    
    // Update FX rate display
    setText('kpiIncomeFxSmall', Number(state.currencyRate||0).toFixed(4));
  }

  function renderAll(){
      renderList('list-personal', state.personal, false);
      renderList('list-biz', state.biz, true);
      const currentYearData = state.income[currentYear] || [];
      renderIncomeList('list-income', currentYearData);
    renderKPIs();
    updateGridTemplate();
    
    // Apply lock state to all inputs after rendering
    updateInputsLockState();
    
    // Update insight cards after rendering
    updateInsightCards();
    
    // Ensure income KPIs are live and up-to-date
    updateIncomeKPIsLive();
    
    // Re-add event listeners after rendering
    addRowButtonListeners();
    
    // Ensure all inputs have instant cloud sync after rendering
    setTimeout(() => {
      // ensureLiveSaveOnAllInputs(); // DISABLED: This was causing duplicate event listeners and cross-row interference
      ensureInstantSyncOnToggles();
    }, 100);
    
    // Apply custom date picker to any new date inputs
    if (typeof applyDatePickerToNewInputs === 'function') {
      applyDatePickerToNewInputs();
    }
  }

  function updateGridTemplate() {
    // For Personal table (no Next column) - name column size matches business table
    const personalTemplate = `24px 32px 1.4fr .8fr .8fr .8fr ${columnOrder.map(() => '1fr').join(' ')} 32px`;
    document.querySelectorAll('.row:not(.row-biz):not(.row-income)').forEach(row => {
      row.style.gridTemplateColumns = personalTemplate;
    });
    
    // For Biz table (with Next column)
    const bizTemplate = `24px 32px 1.4fr .8fr .8fr .8fr .8fr ${columnOrder.map(() => '.9fr').join(' ')} 32px`;
    document.querySelectorAll('.row-biz').forEach(row => {
      row.style.gridTemplateColumns = bizTemplate;
    });
    
    // For Income table (responsive structure)
    let incomeTemplate;
    if (window.innerWidth <= 480) {
      incomeTemplate = `16px 20px 1fr 1.2fr 80px 70px 70px 80px 1fr 20px`;
    } else if (window.innerWidth <= 768) {
      incomeTemplate = `18px 24px 1fr 1.2fr 100px 85px 85px 100px 1fr 24px`;
    } else {
      incomeTemplate = `20px 28px 1fr 1.2fr 120px 100px 100px 120px 1fr 28px`;
    }
    
    document.querySelectorAll('.row-income').forEach(row => {
      row.style.gridTemplateColumns = incomeTemplate;
    });
  }

    // Settings modal
    $('#btnSettings').addEventListener('click', ()=>{ 
      $('#inputFx').value = state.currencyRate; 
      $('#inputIncludeAnnual').value = state.includeAnnualInMonthly ? 'true' : 'false';
      $('#inputDeleteConfirm').value = '';
      $('#btnDeleteAll').disabled = true;
      
      // Sync currency selector in settings
      const settingsCurrencySelect = document.getElementById('settingsCurrencySelect');
      const settingsCurrencyDisplay = document.getElementById('settingsCurrencyDisplay');
      if (settingsCurrencySelect) {
        settingsCurrencySelect.value = state.selectedCurrency || 'EGP';
      }
      if (settingsCurrencyDisplay) {
        settingsCurrencyDisplay.textContent = state.currencySymbol || 'EGP';
      }
      
      // Update last refresh time display
      updateLastRefreshDisplay();
      
      // Test API connection and log available currencies
      testCurrencyAPI();
      
      $('#settings').showModal(); 
    });
    
    // Click outside to close modal
    $('#settings').addEventListener('click', (e) => {
      // Only close if clicking on the backdrop (the dialog element itself)
      if (e.target === $('#settings')) {
        $('#settings').close();
      }
    });
    // Real-time exchange rate updates
    $('#inputFx').addEventListener('input', function() {
      state.fx = Number(this.value) || state.fx;
      state.currencyRate = state.fx; // Keep both in sync
      // Update the currencyRates object with the new rate
      currencyRates[state.selectedCurrency] = state.currencyRate;
      save('fx-rate');
      // Update only EGP calculations without re-rendering inputs
      updateAllCalculationsWithoutRerender();
      // Update income KPIs live when FX rate changes
      updateIncomeKPIsLive();
    });
    
    // Real-time Include Annual setting updates
    $('#inputIncludeAnnual').addEventListener('change', function() {
      state.includeAnnualInMonthly = this.value === 'true';
      updateAutosaveStatus();
      save('include-annual-setting');
      // Update only calculations without re-rendering inputs
      updateAllCalculationsWithoutRerender();
    });
    
    
    // Update only the calculated values in a specific row
    function updateRowCalculations(rowElement, row, isBiz) {
      const mUSD = rowMonthlyUSD(row);
      const yUSD = rowYearlyUSD(row);
      const mSelected = usdToSelectedCurrency(mUSD);
      const ySelected = usdToSelectedCurrency(yUSD);
      
      // Update the calculated columns in this row using new wrapper structure
      const financialWrappers = rowElement.querySelectorAll('.financial-input-wrapper');
      if (financialWrappers.length >= 4) {
        // Monthly USD - update value span
        const mUSDValue = financialWrappers[0].querySelector('.financial-value');
        if (mUSDValue) {
          mUSDValue.textContent = Math.round(mUSD).toLocaleString();
          financialWrappers[0].setAttribute('data-original', Math.round(mUSD));
        }
        
        // Yearly USD - update value span
        const yUSDValue = financialWrappers[1].querySelector('.financial-value');
        if (yUSDValue) {
          yUSDValue.textContent = Math.round(yUSD).toLocaleString();
          financialWrappers[1].setAttribute('data-original', Math.round(yUSD));
        }
        
        // Monthly Selected Currency - update value span
        const mSelectedValue = financialWrappers[2].querySelector('.financial-value');
        if (mSelectedValue) {
          mSelectedValue.textContent = Math.round(mSelected).toLocaleString();
          financialWrappers[2].setAttribute('data-original', Math.round(mSelected));
        }
        
        // Yearly Selected Currency - update value span
        const ySelectedValue = financialWrappers[3].querySelector('.financial-value');
        if (ySelectedValue) {
          ySelectedValue.textContent = Math.round(ySelected).toLocaleString();
          financialWrappers[3].setAttribute('data-original', Math.round(ySelected));
        }
      }
      
      // Update KPIs and analytics
      renderKPIs();
    }

    // Make a calculated value editable
    function makeEditable(element, row, isBiz, rowElement) {
      if (element.classList.contains('editing')) return;
      
      const field = element.getAttribute('data-field');
      const currentValue = element.getAttribute('data-original');
      const type = element.getAttribute('data-type');
      
      // Create input field that replaces the value span but keeps the symbol
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '1';
      input.className = 'editable-input';
      input.value = Math.round(parseFloat(currentValue));
      
      // Find the value span and replace it with input
      const valueSpan = element.querySelector('.financial-value');
      if (valueSpan) {
        valueSpan.style.display = 'none';
        element.appendChild(input);
      } else {
        // Fallback for old structure
        element.innerHTML = '';
        element.appendChild(input);
      }
      
      element.classList.add('editing');
      
      // Focus and select
      input.focus();
      input.select();
      
      // Real-time updates as you type (like cost input) - without losing focus
      input.addEventListener('input', function() {
        const newValue = Math.round(parseFloat(this.value));
        if (!isNaN(newValue)) {
          updateCalculatedValueRealtime(element, row, field, newValue, type, isBiz, rowElement);
        }
      });
      
      // Handle save on blur or enter
      const saveValue = () => {
        const newValue = Math.round(parseFloat(input.value));
        if (!isNaN(newValue) && newValue !== Math.round(parseFloat(currentValue))) {
          updateCalculatedValue(element, row, field, newValue, type, isBiz, rowElement);
        }
        
        // Restore the value span and remove input
        const valueSpan = element.querySelector('.financial-value');
        if (valueSpan) {
          valueSpan.style.display = '';
          input.remove();
        }
        
        element.classList.remove('editing');
      };
      
      input.addEventListener('blur', saveValue);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveValue();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          
          // Restore the value span and remove input
          const valueSpan = element.querySelector('.financial-value');
          if (valueSpan) {
            valueSpan.style.display = '';
            input.remove();
          }
          
          element.classList.remove('editing');
          updateRowCalculations(rowElement, row, isBiz);
        }
      });
    }

    // Update calculated value and recalculate others - real-time version that preserves focus
    function updateCalculatedValueRealtime(element, row, field, newValue, type, isBiz, rowElement) {
      let newBaseCost = row.cost;
      
      // Store the exact value the user typed for the field being edited
      if (field === 'monthlyUSD') {
        row.monthlyUSD = Math.max(0, newValue);
        const monthlyUSD = row.monthlyUSD;
        if (row.billing === 'Monthly') {
          newBaseCost = monthlyUSD;
        } else if (row.billing === 'Annually') {
          newBaseCost = monthlyUSD * 12;
        }
      } else if (field === 'yearlyUSD') {
        row.yearlyUSD = Math.max(0, newValue);
        const yearlyUSD = row.yearlyUSD;
        if (row.billing === 'Monthly') {
          newBaseCost = yearlyUSD / 12;
        } else if (row.billing === 'Annually') {
          newBaseCost = yearlyUSD;
        }
      } else if (field === 'monthlyEGP') {
        // Store the exact selected currency value the user typed
        row.monthlyEGP = Math.max(0, newValue);
        const monthlySelected = row.monthlyEGP;
        const monthlyUSD = monthlySelected / state.currencyRate;
        if (row.billing === 'Monthly') {
          newBaseCost = monthlyUSD;
        } else if (row.billing === 'Annually') {
          newBaseCost = monthlyUSD * 12;
        }
      } else if (field === 'yearlyEGP') {
        // Store the exact selected currency value the user typed
        row.yearlyEGP = Math.max(0, newValue);
        const yearlySelected = row.yearlyEGP;
        const yearlyUSD = yearlySelected / state.currencyRate;
        if (row.billing === 'Monthly') {
          newBaseCost = yearlyUSD / 12;
        } else if (row.billing === 'Annually') {
          newBaseCost = yearlyUSD;
        }
      }
      
      // Update the base cost
      row.cost = newBaseCost;
      
      // Update the cost input field to match the new base cost in real-time
      const costInput = rowElement.querySelector('.cost-input');
      if (costInput) {
        costInput.value = newBaseCost;
        // Trigger visual update to show the change
        costInput.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
          costInput.style.backgroundColor = '';
        }, 200);
      }
      
      // Calculate other values (but don't recalculate the field being edited)
      if (field !== 'monthlyUSD') {
        row.monthlyUSD = row.billing === 'Monthly' ? row.cost : row.cost / 12;
      }
      if (field !== 'yearlyUSD') {
        row.yearlyUSD = row.billing === 'Yearly' ? row.cost : row.cost * 12;
      }
      if (field !== 'monthlyEGP') {
        row.monthlyEGP = usdToSelectedCurrency(row.monthlyUSD);
      }
      if (field !== 'yearlyEGP') {
        row.yearlyEGP = usdToSelectedCurrency(row.yearlyUSD);
      }
      
      // Update ALL calculated values in real-time as you type
      const calculatedDivs = rowElement.querySelectorAll('.text-sm');
      if (calculatedDivs.length >= 4) {
        // Monthly USD - always update with current value
        const monthlyUSDValue = field === 'monthlyUSD' ? newValue : row.monthlyUSD;
        calculatedDivs[0].textContent = '$' + Math.round(monthlyUSDValue).toLocaleString();
        calculatedDivs[0].setAttribute('data-original', Math.round(monthlyUSDValue));
        // Visual feedback for real-time updates
        if (field !== 'monthlyUSD') {
          calculatedDivs[0].style.backgroundColor = '#e8f5e8';
          setTimeout(() => calculatedDivs[0].style.backgroundColor = '', 300);
        }
        
        // Yearly USD - always update with current value
        const yearlyUSDValue = field === 'yearlyUSD' ? newValue : row.yearlyUSD;
        calculatedDivs[1].textContent = '$' + Math.round(yearlyUSDValue).toLocaleString();
        calculatedDivs[1].setAttribute('data-original', Math.round(yearlyUSDValue));
        // Visual feedback for real-time updates
        if (field !== 'yearlyUSD') {
          calculatedDivs[1].style.backgroundColor = '#e8f5e8';
          setTimeout(() => calculatedDivs[1].style.backgroundColor = '', 300);
        }
        
        // Monthly Selected Currency - always update with current value
        const monthlySelectedValue = field === 'monthlyEGP' ? newValue : row.monthlyEGP;
        calculatedDivs[2].textContent = state.currencySymbol + ' ' + Math.round(monthlySelectedValue).toLocaleString();
        calculatedDivs[2].setAttribute('data-original', Math.round(monthlySelectedValue));
        // Visual feedback for real-time updates
        if (field !== 'monthlyEGP') {
          calculatedDivs[2].style.backgroundColor = '#e8f5e8';
          setTimeout(() => calculatedDivs[2].style.backgroundColor = '', 300);
        }
        
        // Yearly Selected Currency - always update with current value
        const yearlySelectedValue = field === 'yearlyEGP' ? newValue : row.yearlyEGP;
        calculatedDivs[3].textContent = state.currencySymbol + ' ' + Math.round(yearlySelectedValue).toLocaleString();
        calculatedDivs[3].setAttribute('data-original', Math.round(yearlySelectedValue));
        // Visual feedback for real-time updates
        if (field !== 'yearlyEGP') {
          calculatedDivs[3].style.backgroundColor = '#e8f5e8';
          setTimeout(() => calculatedDivs[3].style.backgroundColor = '', 300);
        }
      }
      
      // Save the updated state with instant cloud sync for financial inputs
      instantSaveExpenseRow(row, isBiz);
      
      // Clear cache and update KPIs only (no full re-render)
      clearCalculationCache();
      renderKPIs();
    }

    // Update calculated value and recalculate others - full version for final save
    function updateCalculatedValue(element, row, field, newValue, type, isBiz, rowElement) {
      let newBaseCost = row.cost;
      
      // Store the exact value the user typed for the field being edited
      if (field === 'monthlyUSD') {
        row.monthlyUSD = Math.max(0, newValue);
        const monthlyUSD = row.monthlyUSD;
        if (row.billing === 'Monthly') {
          newBaseCost = monthlyUSD;
        } else if (row.billing === 'Annually') {
          newBaseCost = monthlyUSD * 12;
        }
      } else if (field === 'yearlyUSD') {
        row.yearlyUSD = Math.max(0, newValue);
        const yearlyUSD = row.yearlyUSD;
        if (row.billing === 'Monthly') {
          newBaseCost = yearlyUSD / 12;
        } else if (row.billing === 'Annually') {
          newBaseCost = yearlyUSD;
        }
      } else if (field === 'monthlyEGP') {
        // Store the exact selected currency value the user typed
        row.monthlyEGP = Math.max(0, newValue);
        const monthlySelected = row.monthlyEGP;
        const monthlyUSD = monthlySelected / state.currencyRate;
        if (row.billing === 'Monthly') {
          newBaseCost = monthlyUSD;
        } else if (row.billing === 'Annually') {
          newBaseCost = monthlyUSD * 12;
        }
      } else if (field === 'yearlyEGP') {
        // Store the exact selected currency value the user typed
        row.yearlyEGP = Math.max(0, newValue);
        const yearlySelected = row.yearlyEGP;
        const yearlyUSD = yearlySelected / state.currencyRate;
        if (row.billing === 'Monthly') {
          newBaseCost = yearlyUSD / 12;
        } else if (row.billing === 'Annually') {
          newBaseCost = yearlyUSD;
        }
      }
      
      // Update the base cost
      row.cost = newBaseCost;
      
      // Update the cost input field to match the new base cost
      const costInput = rowElement.querySelector('.cost-input');
      if (costInput) {
        costInput.value = newBaseCost;
      }
      
      // Calculate other values (but don't recalculate the field being edited)
      if (field !== 'monthlyUSD') {
        row.monthlyUSD = row.billing === 'Monthly' ? row.cost : row.cost / 12;
      }
      if (field !== 'yearlyUSD') {
        row.yearlyUSD = row.billing === 'Yearly' ? row.cost : row.cost * 12;
      }
      if (field !== 'monthlyEGP') {
        row.monthlyEGP = usdToSelectedCurrency(row.monthlyUSD);
      }
      if (field !== 'yearlyEGP') {
        row.yearlyEGP = usdToSelectedCurrency(row.yearlyUSD);
      }
      
      // Save the updated state with instant cloud sync for financial inputs
      instantSaveExpenseRow(row, isBiz);
      
      // Re-render this row's calculations
      updateRowCalculations(rowElement, row, isBiz);
    }
    
    // Update autosave status indicator
    function updateAutosaveStatus() {
      const status = document.getElementById('autosaveStatus');
      if (status) {
        status.textContent = '● Live Save enabled';
        status.className = 'autosave-status enabled';
      }
    }

    // Enhanced function to ensure all inputs have instant cloud sync
    function ensureLiveSaveOnAllInputs() {

      
      // Add live save to any input that might not have it
      const allInputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]');
      allInputs.forEach(input => {
        // Skip if already has live save
        if (input.hasAttribute('data-live-save')) return;
        
        // Add live save based on input type and context
        const inputType = input.type;
        const className = input.className;
        let source = 'unknown-input';
        
        if (className.includes('cost-input')) {
          source = 'cost-input';
        } else if (className.includes('tag-input')) {
          source = 'tag-input';
        } else if (inputType === 'date') {
          source = 'date-input';
        } else if (inputType === 'number') {
          source = 'number-input';
        } else if (inputType === 'text') {
          source = 'text-input';
        }
        
        // Add event listener for instant cloud sync
        input.addEventListener('input', function() {

          
          // Update the corresponding data based on context
          const rowElement = input.closest('.row, .row-biz, .row-income');
          if (rowElement) {
            const rowIndex = Array.from(rowElement.parentNode.children).indexOf(rowElement) - 1; // -1 for header
            const isBiz = rowElement.classList.contains('row-biz');
            const isIncome = rowElement.classList.contains('row-income');
            
            if (isIncome) {
              // Handle income row updates
              const year = currentYear;
              if (state.income[year] && state.income[year][rowIndex]) {
                const row = state.income[year][rowIndex];
                if (className.includes('cost-input') || input.placeholder.includes('$')) {
                  row.paidUsd = Number(input.value) || 0;
                } else if (input.placeholder.includes('Total')) {
                  row.allPayment = Number(input.value) || 0;
                } else {
                  row.name = input.value;
                }
                instantSaveIncomeRow(row, year);
              }
            } else {
              // Handle expense row updates
              const arr = isBiz ? state.biz : state.personal;
              if (arr && arr[rowIndex]) {
                const row = arr[rowIndex];
                if (className.includes('cost-input')) {
                  row.cost = Number(input.value) || 0;
                } else {
                  row.name = input.value;
                }
                instantSaveExpenseRow(row, isBiz);
                updateRowCalculations(rowElement, row, isBiz);
                renderKPIs();
              }
            }
          } else {
            // General input (like FX rate) - use instant save
            instantSaveAll(source);
          }
        });
        
        // Mark as having live save
        input.setAttribute('data-live-save', 'true');
      });
      

    }
    
    // Ensure all toggles (status, billing) have instant cloud sync
    function ensureInstantSyncOnToggles() {

      
      // Find all status and billing toggles
      const statusToggles = document.querySelectorAll('[data-status-toggle]:not([data-instant-sync])');
      const billingToggles = document.querySelectorAll('[data-billing-toggle]:not([data-instant-sync])');
      
      statusToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {

          const rowElement = this.closest('.row, .row-biz');
          if (rowElement) {
            const rowIndex = Array.from(rowElement.parentNode.children).indexOf(rowElement) - 1;
            const isBiz = rowElement.classList.contains('row-biz');
            const row = isBiz ? state.biz[rowIndex] : state.personal[rowIndex];
            if (row) {
              instantSaveExpenseRow(row, isBiz);
            }
          }
        });
        toggle.setAttribute('data-instant-sync', 'true');
      });
      
      billingToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {

          const rowElement = this.closest('.row, .row-biz');
          if (rowElement) {
            const rowIndex = Array.from(rowElement.parentNode.children).indexOf(rowElement) - 1;
            const isBiz = rowElement.classList.contains('row-biz');
            const row = isBiz ? state.biz[rowIndex] : state.personal[rowIndex];
            if (row) {
              instantSaveExpenseRow(row, isBiz);
            }
          }
        });
        toggle.setAttribute('data-instant-sync', 'true');
      });
      

    }
    
    // Performance optimization: Debounced rendering
    let renderTimeout = null;
    function debouncedRender() {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      renderTimeout = setTimeout(() => {
        renderAll();
        renderTimeout = null;
      }, 50); // 50ms debounce for rendering
    }
    
    // Performance optimization: Cached calculations
    let calculationCache = new Map();
    function getCachedCalculation(key, calculationFn) {
      if (calculationCache.has(key)) {
        return calculationCache.get(key);
      }
      const result = calculationFn();
      calculationCache.set(key, result);
      return result;
    }
    
    // Clear cache when data changes
    function clearCalculationCache() {
      calculationCache.clear();
    }
    
    // Performance optimization: Batch DOM updates
    function batchDOMUpdates(updates) {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        updates.forEach(update => update());
      });
    }
    
    function updateSettingsUI() {
      // Update FX rate display
      const fxDisplay = document.getElementById('fxDisplay');
      if (fxDisplay) {
        fxDisplay.textContent = state.fx.toFixed(4);
      }
      
      // Update autosave status
      updateAutosaveStatus();
      
      // Update theme if needed
      if (state.theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      
      // Update Include Annual in Monthly setting
      const includeAnnualSelect = document.getElementById('inputIncludeAnnual');
      if (includeAnnualSelect) {
        includeAnnualSelect.value = state.includeAnnualInMonthly ? 'true' : 'false';

      }
      
      // Update calculations without re-rendering inputs
      updateAllCalculationsWithoutRerender();
    }
    
    function updateAllCalculationsWithoutRerender() {
      // Update all EGP values in existing rows without re-rendering
      const personalRows = document.querySelectorAll('#list-personal .row');
      personalRows.forEach((rowEl, idx) => {
        const rowData = state.personal[idx];
        if (rowData) {
          updateRowCalculations(rowEl, rowData, false);
        }
      });
      
      const bizRows = document.querySelectorAll('#list-biz .row');
      bizRows.forEach((rowEl, idx) => {
        const rowData = state.biz[idx];
        if (rowData) {
          updateRowCalculations(rowEl, rowData, true);
        }
      });
      
      // Update KPIs
      renderKPIs();
    }
    
    
    // Refresh FX rate button
    // Currency refresh function
    async function refreshCurrencyRate(showFeedback = true) {
      const btn = $('#btnRefreshFx');
      const originalContent = btn.innerHTML;
      
      if (showFeedback) {
        btn.innerHTML = '<svg class="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.364-6.364"/></svg>';
        btn.disabled = true;
        btn.title = 'Fetching latest rates...';
      }
      
      try {
        const selectedCurrency = state.selectedCurrency || 'EGP';
        
        // Create dynamic API endpoints based on selected currency
        // All APIs fetch USD rates and we extract the selected currency from USD
        const apiEndpoints = [
          `https://api.exchangerate.host/latest?base=USD&symbols=${selectedCurrency}`,
          `https://api.exchangerate-api.com/v4/latest/USD`,
          `https://api.fxratesapi.com/latest?base=USD`,
          `https://api.exchangerate.host/latest?base=USD`,
          `https://api.currencyapi.com/v3/latest?apikey=free&currencies=${selectedCurrency}&base_currency=USD`,
          `https://api.fixer.io/latest?access_key=free&base=USD&symbols=${selectedCurrency}`
        ];
        
        let data = null;
        let lastError = null;
        let newRate = null;
        
        // Try each API endpoint
        for (const endpoint of apiEndpoints) {
          try {
            console.log(`🔄 Trying API endpoint: ${endpoint} for currency: ${selectedCurrency}`);
            
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              // Add timeout to prevent hanging
              signal: AbortSignal.timeout(10000) // 10 second timeout per endpoint
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            data = await response.json();
            console.log(`📊 API Response from ${endpoint}:`, data);
            
            // Check if data has the expected structure and extract rate
            if (data && data.rates && data.rates[selectedCurrency]) {
              newRate = data.rates[selectedCurrency];
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else if (data && data.data && data.data[selectedCurrency]) {
              newRate = data.data[selectedCurrency].value;
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else if (data && data.result && data.result[selectedCurrency]) {
              newRate = data.result[selectedCurrency];
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else if (data && data.quotes && data.quotes[`USD${selectedCurrency}`]) {
              newRate = data.quotes[`USD${selectedCurrency}`];
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else if (data && data.conversion_rates && data.conversion_rates[selectedCurrency]) {
              newRate = data.conversion_rates[selectedCurrency];
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else if (data && data.response && data.response.rates && data.response.rates[selectedCurrency]) {
              newRate = data.response.rates[selectedCurrency];
              console.log(`✅ Successfully fetched ${selectedCurrency} rate from ${endpoint}:`, newRate);
              break; // Success, exit the loop
            } else {
              // Log available currencies for debugging
              const availableCurrencies = data?.rates ? Object.keys(data.rates) : 
                                        data?.data ? Object.keys(data.data) : 
                                        data?.result ? Object.keys(data.result) : 
                                        data?.quotes ? Object.keys(data.quotes) : 
                                        data?.conversion_rates ? Object.keys(data.conversion_rates) :
                                        data?.response?.rates ? Object.keys(data.response.rates) : 'none';
              console.warn(`❌ Currency ${selectedCurrency} not found in ${endpoint}. Available:`, availableCurrencies);
              console.warn(`📊 Full response structure:`, Object.keys(data || {}));
              throw new Error(`Currency ${selectedCurrency} not found in API response`);
            }
          } catch (error) {
            lastError = error;
            console.warn(`❌ API endpoint failed: ${endpoint}`, error.message);
            continue; // Try next endpoint
          }
        }
        
        if (!newRate) {
          throw lastError || new Error(`All API endpoints failed to fetch ${selectedCurrency} rate`);
        }
        
        // Validate the rate
        if (newRate > 0) {
          console.log(`🎯 Final rate validation: ${newRate} for ${selectedCurrency}`);
          $('#inputFx').value = newRate.toFixed(4);
          state.currencyRate = newRate;
          state.fx = newRate; // Keep both in sync
          
          // Update the currencyRates object with the live rate
          currencyRates[state.selectedCurrency] = newRate;
          console.log(`💾 Updated currencyRates[${selectedCurrency}] = ${newRate}`);
          
          if (showFeedback) {
            // Show success feedback
            btn.style.background = '#10b981';
            btn.style.borderColor = '#10b981';
            btn.title = `Updated! Rate: ${newRate.toFixed(4)}`;
            setTimeout(() => {
              btn.style.background = '';
              btn.style.borderColor = '';
              btn.title = 'Refresh from live rate';
            }, 3000);
          }
          
          // Update currency system and save
          updateCurrency(state.selectedCurrency);
          save();
          
          // Show notification
          showNotification(`Currency rate updated to ${newRate.toFixed(4)} ${state.currencySymbol}`);
          
          // Store last successful refresh time
          localStorage.setItem('lastCurrencyRefresh', new Date().toISOString());
          
          return true;
        } else {
          throw new Error('Invalid rate received from API');
        }
      } catch (error) {
        console.warn('Currency API failed, using fallback rate:', error);
        
        // Fallback to the current currency's default rate if API fails
        const selectedCurrency = state.selectedCurrency || 'EGP';
        const fallbackRates = {
          'EGP': 48.1843,
          'KWD': 0.31,
          'SAR': 3.75,
          'AED': 3.67,
          'QAR': 3.64,
          'BHD': 0.38,
          'EUR': 0.92
        };
        const fallbackRate = fallbackRates[selectedCurrency] || 48.1843;
        $('#inputFx').value = fallbackRate.toFixed(4);
        state.currencyRate = fallbackRate;
        state.fx = fallbackRate; // Keep both in sync
        
        // Update the currencyRates object with the fallback rate
        currencyRates[selectedCurrency] = fallbackRate;
        
        if (showFeedback) {
          btn.style.background = '#f59e0b';
          btn.style.borderColor = '#f59e0b';
          btn.title = `API failed, using fallback rate: ${fallbackRate.toFixed(4)}`;
          setTimeout(() => {
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.title = 'Refresh from live rate';
          }, 3000);
        }
        
        // Update currency system and save
        updateCurrency(state.selectedCurrency);
        save();
        
        // Show warning notification
        showNotification(`API unavailable, using fallback rate: ${fallbackRate.toFixed(4)} ${state.currencySymbol}`, 'warning');
        return false;
      } finally {
        if (showFeedback) {
          btn.innerHTML = originalContent;
          btn.disabled = false;
        }
      }
    }
    
    // Function to test currency API and show available currencies
    async function testCurrencyAPI() {
      try {
        console.log('🧪 Testing currency API...');
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        
        if (data && data.rates) {
          const availableCurrencies = Object.keys(data.rates);
          console.log('📊 Available currencies from API:', availableCurrencies);
          
          // Check if our supported currencies are available
          const supportedCurrencies = ['EGP', 'KWD', 'SAR', 'AED', 'QAR', 'BHD', 'EUR'];
          const availableSupported = supportedCurrencies.filter(currency => 
            availableCurrencies.includes(currency)
          );
          
          console.log('✅ Our supported currencies available in API:', availableSupported);
          
          // Test specific rates
          supportedCurrencies.forEach(currency => {
            if (data.rates[currency]) {
              console.log(`💰 ${currency}: ${data.rates[currency]}`);
            }
          });
          
          return availableSupported;
        }
      } catch (error) {
        console.warn('❌ Currency API test failed:', error);
        return [];
      }
    }
    
    // Function to test a specific currency rate
    async function testSpecificCurrency(currency) {
      try {
        console.log(`🧪 Testing specific currency: ${currency}`);
        const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${currency}`);
        const data = await response.json();
        console.log(`📊 Response for ${currency}:`, data);
        
        if (data && data.rates && data.rates[currency]) {
          console.log(`✅ Rate for ${currency}: ${data.rates[currency]}`);
          return data.rates[currency];
        } else {
          console.warn(`❌ No rate found for ${currency}`);
          return null;
        }
      } catch (error) {
        console.warn(`❌ Test failed for ${currency}:`, error);
        return null;
      }
    }
    
    // Function to update last refresh time display
    function updateLastRefreshDisplay() {
      const lastRefresh = localStorage.getItem('lastCurrencyRefresh');
      const refreshBtn = $('#btnRefreshFx');
      
      if (lastRefresh && refreshBtn) {
        const refreshDate = new Date(lastRefresh);
        const now = new Date();
        const diffMinutes = Math.floor((now - refreshDate) / (1000 * 60));
        
        let timeText = '';
        if (diffMinutes < 1) {
          timeText = 'Just now';
        } else if (diffMinutes < 60) {
          timeText = `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60);
          timeText = `${hours}h ago`;
        } else {
          const days = Math.floor(diffMinutes / 1440);
          timeText = `${days}d ago`;
        }
        
        // Update button title to show last refresh time
        refreshBtn.title = `Refresh from live rate (Last: ${timeText})`;
      }
    }
    
    // Refresh FX rate button
    $('#btnRefreshFx').addEventListener('click', () => {
      refreshCurrencyRate(true).then(() => {
        // Update display after successful refresh
        updateLastRefreshDisplay();
      });
    });
    
    // Settings currency selector
    const settingsCurrencySelect = document.getElementById('settingsCurrencySelect');
    const settingsCurrencyDisplay = document.getElementById('settingsCurrencyDisplay');
    
    if (settingsCurrencySelect) {
      // Set initial value
      settingsCurrencySelect.value = state.selectedCurrency || 'EGP';
      if (settingsCurrencyDisplay) {
        settingsCurrencyDisplay.textContent = state.currencySymbol || 'EGP';
      }
      
      // Handle currency change in settings
      settingsCurrencySelect.addEventListener('change', (e) => {
        const newCurrency = e.target.value;
        updateCurrency(newCurrency);
        
        // Update the display
        if (settingsCurrencyDisplay) {
          settingsCurrencyDisplay.textContent = state.currencySymbol;
        }
        
        // Update the FX input with the new currency's rate
        $('#inputFx').value = state.currencyRate.toFixed(4);
        
        // Update all displays with new currency
        updateAllKPIDisplays();
        
        // Save the changes
        save();
      });
    }
    
    // Auto-refresh currency removed to prevent KPI flickering
    // Users can manually refresh currency rates using the refresh button
    
    // Enhanced Export/Import functionality - moved inside DOMContentLoaded
    setTimeout(() => {
      const exportBtn = $('#btnExportData');
      const importBtn = $('#btnImportData');
      
      if (exportBtn) {
        exportBtn.addEventListener('click', ()=>{

          showExportOptions();
        });

      } else {

      }
      
      if (importBtn) {
        importBtn.addEventListener('click', ()=>{

          showImportOptions();
        });

      } else {

      }
    }, 100);
    
    function showExportOptions() {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <h3 style="color: var(--fg); margin-bottom: 1rem;">Export Data</h3>
          <p style="color: var(--muted); margin-bottom: 1rem; font-size: 0.8rem;">Choose which data to export:</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="exportPersonal" checked style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Personal Expenses</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="exportBiz" checked style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Business Expenses</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="exportIncome" checked style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Income Data (All Years)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="exportSettings" checked style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Settings & Preferences</span>
            </label>
          </div>
          
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button id="cancelExport" class="btn btn-ghost" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Cancel</button>
            <button id="confirmExport" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Export</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Event listeners
      $('#cancelExport').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      $('#confirmExport').addEventListener('click', () => {
        const exportData = {};
        
        if (document.getElementById('exportPersonal').checked) {
          exportData.personal = state.personal;
        }
        if (document.getElementById('exportBiz').checked) {
          exportData.biz = state.biz;
        }
        if (document.getElementById('exportIncome').checked) {
          exportData.income = state.income;
        }
        if (document.getElementById('exportSettings').checked) {
          exportData.fx = state.fx;
          exportData.theme = state.theme;
          exportData.autosave = state.autosave;
          exportData.includeAnnualInMonthly = state.includeAnnualInMonthly;
        }
        
        const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'financial-data.json';
      link.click();
      URL.revokeObjectURL(url);
        
        document.body.removeChild(modal);
        showNotification('📁 Data exported successfully', 'success', 2000, { force: true });
      });
    }
    
    function showImportOptions() {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <h3 style="color: var(--fg); margin-bottom: 1rem;">Import Data</h3>
          <p style="color: var(--muted); margin-bottom: 1rem; font-size: 0.8rem;">Choose which data to import:</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="importPersonal" style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Personal Expenses</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="importBiz" style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Business Expenses</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="importIncome" style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Income Data (All Years)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="importSettings" style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Settings & Preferences</span>
            </label>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="replaceExisting" style="accent-color: var(--primary);">
              <span style="color: var(--fg); font-size: 0.8rem;">Replace existing data (otherwise merge)</span>
            </label>
          </div>
          
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button id="cancelImport" class="btn btn-ghost" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Cancel</button>
            <button id="selectFile" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Select File</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Event listeners
      $('#cancelImport').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      $('#selectFile').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedData = JSON.parse(e.target.result);
              const replaceExisting = document.getElementById('replaceExisting').checked;
              
              // Import selected data
              if (document.getElementById('importPersonal').checked && importedData.personal) {
                if (replaceExisting) {
                  // Clear existing data first
                  state.personal = [];
                }
                // Add imported data and clear IDs to prevent duplicates
                const newPersonalData = importedData.personal.map(item => {
                  const cleanItem = { ...item };
                  delete cleanItem.id; // Clear ID to ensure it's treated as new
                  return cleanItem;
                });
                state.personal = [...state.personal, ...newPersonalData];
              }
              
              if (document.getElementById('importBiz').checked && importedData.biz) {
                if (replaceExisting) {
                  // Clear existing data first
                  state.biz = [];
                }
                // Add imported data and clear IDs to prevent duplicates
                const newBizData = importedData.biz.map(item => {
                  const cleanItem = { ...item };
                  delete cleanItem.id; // Clear ID to ensure it's treated as new
                  return cleanItem;
                });
                state.biz = [...state.biz, ...newBizData];
              }
              
              if (document.getElementById('importIncome').checked && importedData.income) {
                if (replaceExisting) {
                  // Clear existing income data first
                  state.income = {};
                }
                // Merge income data by year and clear IDs to prevent duplicates
                Object.keys(importedData.income).forEach(year => {
                  if (!state.income[year]) {
                    state.income[year] = [];
                  }
                  // Clear IDs for new data to ensure they get saved as new records
                  const newIncomeData = importedData.income[year].map(item => {
                    const cleanItem = { ...item };
                    delete cleanItem.id; // Clear ID to ensure it's treated as new
                    return cleanItem;
                  });
                  state.income[year] = [...state.income[year], ...newIncomeData];
                });
                
                // Update available years to include imported years
                const importedYears = Object.keys(importedData.income).map(year => parseInt(year));
                const currentYears = Object.keys(state.income).map(year => parseInt(year));
                const allYears = [...new Set([...currentYears, ...importedYears])].sort((a, b) => a - b);
                
                
                // Update year tabs UI to show imported years
                createYearTabsFromData(state.income);
                
                // Save imported income rows to Supabase sequentially
                if (currentUser && supabaseReady) {
                  // Force all imported rows to be treated as new by clearing their IDs
                  const cleanedImportData = {};
                  Object.keys(importedData.income).forEach(year => {
                    cleanedImportData[year] = (state.income[year] || []).map(row => {
                      const cleanRow = { ...row };
                      delete cleanRow.id; // Ensure no ID exists
                      return cleanRow;
                    });
                  });
                  
                  saveImportedIncomeSequentially(cleanedImportData);
                } else {
                  showNotification('Imported data saved locally only - please sign in to sync to cloud', 'warning', 4000);
                }
              }
              
              if (document.getElementById('importSettings').checked) {
                if (importedData.fx) state.fx = importedData.fx;
                if (importedData.theme) state.theme = importedData.theme;
                if (importedData.autosave) state.autosave = importedData.autosave;
                if (importedData.includeAnnualInMonthly !== undefined) state.includeAnnualInMonthly = importedData.includeAnnualInMonthly;
              }
              
              // Run deduplication after import to clean up any duplicates
              if (window.deduplicateAllData) {

                window.deduplicateAllData();
              }
              
              save();
              renderAll();
              document.body.removeChild(modal);
              showNotification('📥 Data imported successfully', 'success', 2000, { force: true });
              
            } catch (error) {
              showNotification('Invalid file format', 'error', 3000);
            }
          };
          reader.readAsText(file);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
      });
    }
    
    // Keep the old file input for backward compatibility
    $('#fileInput').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e)=>{
        try {
          const importedData = JSON.parse(e.target.result);
          if (confirm('This will replace all current data. Continue?')) {
            state = importedData;
            // Clear IDs for new data to be created in Firebase
            state.personal.forEach(item => delete item.id);
            state.biz.forEach(item => delete item.id);
            save();
            renderAll();
            showNotification('Data imported', 'success', 2000);
          }
        } catch (error) {
          showNotification('Invalid file format', 'error', 3000);
        }
      };
      reader.readAsText(file);
    });
    
    async function clearAllData() {
      // Reset state to default
      state = structuredClone(defaultState);
      
      if (currentUser && supabaseReady) {
        try {
          // Delete backup data from Supabase
          const { error } = await window.supabaseClient
            .from('backups')
            .delete()
            .eq('user_id', currentUser.id);
          
          if (error) throw error;
          
          showNotification('All cloud data deleted', 'success', 3000);
        } catch (error) {

          showNotification('Error clearing cloud data', 'error', 3000);
        }
      } else {
        // Clear all localStorage
        localStorage.clear();
        showNotification('All local data deleted', 'success', 3000);
      }
      
      // Re-render everything
      renderAll();
      
      // Close settings modal
      $('#settings').close();
    }
    
    // Delete all data functionality
    $('#inputDeleteConfirm').addEventListener('input', (e)=>{
      const btn = $('#btnDeleteAll');
      btn.disabled = e.target.value !== 'DELETE';
    });
    
    $('#btnDeleteAll').addEventListener('click', ()=>{
      if ($('#inputDeleteConfirm').value === 'DELETE') {
        if (confirm('Are you absolutely sure? This will permanently delete ALL data and cannot be undone!')) {
          clearAllData();
          showNotification('All data deleted', 'success', 3000);
        }
      }
    });



  // Add individual event listeners to add row buttons to prevent unwanted row addition during refresh
    function addRowButtonListeners() {
      // Remove existing event listeners first to prevent duplicates
      const buttons = document.querySelectorAll('[data-add-row]');
      buttons.forEach(btn => {
        // Clone and replace to remove all event listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
      });
      
      // Personal expenses add row button
      const personalAddBtn = document.querySelector('[data-add-row="personal"]');
      if (personalAddBtn) {
        personalAddBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          addRow('personal');
        });
      }
      
      // Business expenses add row button
      const bizAddBtn = document.querySelector('[data-add-row="biz"]');
      if (bizAddBtn) {
        bizAddBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          addRow('biz');
        });
      }
      
      // Income add row button
      const incomeAddBtn = document.querySelector('[data-add-row="income"]');
      if (incomeAddBtn) {
        incomeAddBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          addRow('income');
        });
      }
    }
    
    // Add event listeners when page loads
    addRowButtonListeners();

  // Global dropdown close handler
  document.addEventListener('click', function(e) {
    // Close all method dropdowns (income table)
    document.querySelectorAll('.method-dropdown-minimal.open').forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        dropdown.querySelector('.method-menu-minimal').classList.remove('show');
      }
    });
  });

     // KPI Card Analytics - Click to expand
     document.addEventListener('click', (e) => {
       const kpiCard = e.target.closest('.kpi[data-analytics]');
       if (kpiCard && !e.target.closest('.analytics-close') && !e.target.closest('.analytics-content')) {
         // Disable expansion on analytics page
         if (currentPage === 'analytics') {
           return;
         }
         
         // Close any other expanded cards
         document.querySelectorAll('.kpi.expanded').forEach(card => {
           if (card !== kpiCard) {
             card.classList.remove('expanded');
           }
         });
         
         // Toggle current card
         kpiCard.classList.toggle('expanded');
       }
     });

     // Close analytics when clicking close button
     document.addEventListener('click', (e) => {
       if (e.target.matches('[data-close-analytics]')) {
         const kpiCard = e.target.closest('.kpi');
         if (kpiCard) {
           kpiCard.classList.remove('expanded');
         }
       }
     });

     // Close analytics when clicking outside
     document.addEventListener('click', (e) => {
       if (!e.target.closest('.kpi') && !e.target.closest('.analytics-content')) {
         document.querySelectorAll('.kpi.expanded').forEach(card => {
           card.classList.remove('expanded');
         });
       }
     });

    // Note: renderAll() is now called after data loading in loadUserData() or loadLocalData()
    // Initial render will happen after authentication check completes

    // Note: Using built-in sticky headers with position: sticky on .row-head elements
    

    // Drag and Drop functionality for financial columns
    let draggedElement = null;
    let draggedColumn = null;
    
    function updateColumnOrder() {
      localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
      applyColumnOrder();
    }
    
    function applyColumnOrder() {
      // Apply to both Personal and Biz tables
      ['', '-biz'].forEach(suffix => {
        const headerRow = document.querySelector(`.row-head${suffix}`);
        if (!headerRow) return;
        
        const financialColumns = headerRow.querySelectorAll('.financial-column');
        const newOrder = [...financialColumns].sort((a, b) => {
          const aIndex = columnOrder.indexOf(a.dataset.column);
          const bIndex = columnOrder.indexOf(b.dataset.column);
          return aIndex - bIndex;
        });
        
        // Reorder the columns in the header
        financialColumns.forEach(col => {
          const newCol = newOrder.find(c => c.dataset.column === col.dataset.column);
          if (newCol && newCol !== col) {
            col.parentNode.insertBefore(newCol, col.nextSibling);
          }
        });
      });
      
      // Update CSS grid template columns based on new order
      updateGridTemplate();
    }
    
    
    // Add drag event listeners
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-header')) {
        draggedElement = e.target;
        draggedColumn = e.target.dataset.column;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
      }
    });
    
    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('draggable-header')) {
        e.target.classList.remove('dragging');
        draggedElement = null;
        draggedColumn = null;
        // Remove all drag-over classes
        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drag-over'));
      }
    });
    
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.target.classList.contains('financial-column') && e.target !== draggedElement) {
        e.target.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      if (e.target.classList.contains('financial-column')) {
        e.target.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.target.classList.contains('financial-column') && e.target !== draggedElement) {
        e.target.classList.remove('drag-over');
        
        const targetColumn = e.target.dataset.column;
        const draggedIndex = columnOrder.indexOf(draggedColumn);
        const targetIndex = columnOrder.indexOf(targetColumn);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Remove dragged column from its current position
          columnOrder.splice(draggedIndex, 1);
          // Insert it at the new position
          const newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
          columnOrder.splice(newIndex, 0, draggedColumn);
          
          updateColumnOrder();
        }
      }
    });
    
    // Show loading skeletons for first 2 seconds
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const loadingSkeletonBiz = document.getElementById('loading-skeleton-biz');
    
    if (loadingSkeleton) {
      loadingSkeleton.classList.remove('hidden');
    }
    if (loadingSkeletonBiz) {
      loadingSkeletonBiz.classList.remove('hidden');
    }
    
    // Hide skeletons after minimum loading time
    setTimeout(() => {
      if (loadingSkeleton) {
        loadingSkeleton.classList.add('hidden');
      }
      if (loadingSkeletonBiz) {
        loadingSkeletonBiz.classList.add('hidden');
      }
    }, 2000);
    
    // Initialize column order on page load (after renderAll)
    applyColumnOrder();

    // Row drag and drop functionality
    let draggedRow = null;
    let draggedRowIndex = null;
    let draggedRowArray = null;

    // Add row drag event listeners
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('row-draggable') || e.target.closest('.row-draggable')) {
        const rowElement = e.target.classList.contains('row-draggable') ? e.target : e.target.closest('.row-draggable');
        draggedRow = rowElement;
        draggedRowIndex = parseInt(rowElement.getAttribute('data-row-index'));
        if (rowElement.closest('#list-personal')) {
          draggedRowArray = state.personal;
        } else if (rowElement.closest('#list-biz')) {
          draggedRowArray = state.biz;
        } else if (rowElement.closest('#list-income')) {
          draggedRowArray = state.income[currentYear] || [];
        }
        rowElement.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Prevent default drag behavior
        
        // Create a custom drag image (invisible)
        const dragImage = document.createElement('div');
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.width = '1px';
        dragImage.style.height = '1px';
        dragImage.style.background = 'transparent';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        
        // Clean up the drag image after a short delay
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 0);
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('row-draggable') || e.target.closest('.row-draggable')) {
        const rowElement = e.target.classList.contains('row-draggable') ? e.target : e.target.closest('.row-draggable');
        rowElement.classList.remove('dragging');
        draggedRow = null;
        draggedRowIndex = null;
        draggedRowArray = null;
        // Remove all drag-over classes
        document.querySelectorAll('.row-drop-zone').forEach(el => el.classList.remove('drag-over'));
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dropZone = e.target.classList.contains('row-drop-zone') ? e.target : e.target.closest('.row-drop-zone');
      if (dropZone && dropZone !== draggedRow) {
        dropZone.classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      const dropZone = e.target.classList.contains('row-drop-zone') ? e.target : e.target.closest('.row-drop-zone');
      if (dropZone) {
        dropZone.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropZone = e.target.classList.contains('row-drop-zone') ? e.target : e.target.closest('.row-drop-zone');
      if (dropZone && dropZone !== draggedRow) {
        dropZone.classList.remove('drag-over');
        
        const targetRowIndex = parseInt(dropZone.getAttribute('data-row-index'));
        let targetArray;
        if (dropZone.closest('#list-personal')) {
          targetArray = state.personal;
        } else if (dropZone.closest('#list-biz')) {
          targetArray = state.biz;
        } else if (dropZone.closest('#list-income')) {
          targetArray = state.income[currentYear] || [];
        }
        
        // Only allow drops within the same table
        if (draggedRowArray === targetArray && draggedRowIndex !== targetRowIndex) {
          // Remove the dragged item from its current position
          const draggedItem = draggedRowArray.splice(draggedRowIndex, 1)[0];
          
          // Adjust target index if we're moving down
          const adjustedTargetIndex = draggedRowIndex < targetRowIndex ? targetRowIndex - 1 : targetRowIndex;
          
          // Insert the item at the new position
          draggedRowArray.splice(adjustedTargetIndex, 0, draggedItem);
          
          // Update order properties for all rows in the array
          draggedRowArray.forEach((row, index) => {
            row.order = index;
          });
          
          // Save and re-render
          if (dropZone.closest('#list-income')) {
            // Use specific save for income table
            saveToLocal();
            renderAll();
            showNotification('Income row reordered', 'success', 1500);
          } else {
            // Use regular save for other tables
          save();
          renderAll();
          showNotification('Row reordered', 'success', 1500);
          }
        }
      }
    });

    // Tag system helper functions
    function createTagChip(tagText) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      
      // Create text span
      const textSpan = document.createElement('span');
      textSpan.textContent = tagText;
      textSpan.style.flex = '1';
      textSpan.style.whiteSpace = 'nowrap';
      
      // Create remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-chip-remove';
      removeBtn.innerHTML = '×';
      removeBtn.style.flexShrink = '0';
      removeBtn.style.marginLeft = '4px';
      
      // Add event listener for remove button
      removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Remove the chip
        
        // Try multiple ways to find the wrapper
        let wrapper = chip.closest('.tag-input-wrapper');
        if (!wrapper) {
          // Try finding by parent elements
          wrapper = chip.parentElement?.closest('.tag-input-wrapper');
        }
        if (!wrapper) {
          // Try finding by looking up the DOM tree
          let parent = chip.parentElement;
          while (parent && !wrapper) {
            if (parent.classList?.contains('tag-input-wrapper')) {
              wrapper = parent;
              break;
            }
            parent = parent.parentElement;
          }
        }
        
        // If still no wrapper, try searching the entire document for tag-input-wrapper near this chip
        if (!wrapper) {
          const allWrappers = document.querySelectorAll('.tag-input-wrapper');
          
          // Find the wrapper that contains this chip
          for (let w of allWrappers) {
            if (w.contains(chip)) {
              wrapper = w;
              break;
            }
          }
        }
        
        if (wrapper) {
          const rowElement = wrapper.closest('.row-income');
          
          if (rowElement) {
            let rowData = rowElement.__rowData;
            
            // If no __rowData, try to find it by looking at the row structure
            if (!rowData) {
              // Try to find the row data by looking at the table structure
              const allRows = document.querySelectorAll('.row-income');
              const rowIndex = Array.from(allRows).indexOf(rowElement);
              
              if (rowIndex !== -1 && state.income[currentYear] && state.income[currentYear][rowIndex]) {
                rowData = state.income[currentYear][rowIndex];
              }
            }
            
            if (rowData) {
              // Remove the chip first
              chip.remove();
              // Then update the tags
              updateRowTags(wrapper, rowData);
            } else {
              // Still remove the chip even if we can't update
              chip.remove();
            }
          } else {
            chip.remove();
          }
        } else {
          chip.remove();
          
          // Fallback: try to update state manually by finding the row
          const allRows = document.querySelectorAll('.row-income');
          for (let i = 0; i < allRows.length; i++) {
            const row = allRows[i];
            if (row.contains(chip)) {
              if (state.income[currentYear] && state.income[currentYear][i]) {
                const rowData = state.income[currentYear][i];
                
                // Get all remaining tags from this row
                const remainingChips = row.querySelectorAll('.tag-chip');
                const remainingTags = Array.from(remainingChips).map(c => {
                  const textSpan = c.querySelector('span:first-child');
                  return textSpan ? textSpan.textContent.trim() : '';
                }).filter(tag => tag);
                
                rowData.tags = remainingTags.join(',');
                
                // Save directly
                saveIncomeRowDirectly(rowData, currentYear);
                break;
              }
            }
          }
        }
      });
      
      chip.appendChild(textSpan);
      chip.appendChild(removeBtn);
      
      return chip;
    }
    
    function handleTagInput(input, wrapper, row) {
      const value = input.value.trim();
      if (value.includes(',')) {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const currentTagCount = wrapper.querySelectorAll('.tag-chip').length;
        const maxTags = 5; // Maximum number of tags allowed
        
        tags.forEach(tag => {
          if (!isTagAlreadyAdded(wrapper, tag) && currentTagCount < maxTags) {
            const chip = createTagChip(tag);
            wrapper.insertBefore(chip, input);
            currentTagCount++;
          }
        });
        input.value = '';
        
        // Use stored row data or fallback to parameter
        const rowData = wrapper.__rowData || row;
        if (rowData) {
          updateRowTags(wrapper, rowData);
        }
        
        // Update placeholder if max tags reached
        if (wrapper.querySelectorAll('.tag-chip').length >= maxTags) {
          input.placeholder = '';
          input.disabled = true;
        }
      } else if (value.length > 0) {
        // Show suggestions as user types
        showTagSuggestions(input, wrapper);
      } else {
        // Hide suggestions when input is empty
        hideTagSuggestions(wrapper);
      }
    }
    
    function handleTagKeydown(e, input, wrapper, row) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = input.value.trim();
        const currentTagCount = wrapper.querySelectorAll('.tag-chip').length;
        const maxTags = 5;
        
        if (value && !isTagAlreadyAdded(wrapper, value) && currentTagCount < maxTags) {
          const chip = createTagChip(value);
          wrapper.insertBefore(chip, input);
          input.value = '';
          
          // Use stored row data or fallback to parameter
          const rowData = wrapper.__rowData || row;
          if (rowData) {
            updateRowTags(wrapper, rowData);
          }
          
          // Update placeholder if max tags reached
          if (wrapper.querySelectorAll('.tag-chip').length >= maxTags) {
            input.placeholder = '';
            input.disabled = true;
          }
        }
      } else if (e.key === 'Backspace' && input.value === '') {
        const chips = wrapper.querySelectorAll('.tag-chip');
        if (chips.length > 0) {
          const lastChip = chips[chips.length - 1];
          lastChip.remove();
          
          // Use stored row data or fallback to parameter
          const rowData = wrapper.__rowData || row;
          if (rowData) {
            updateRowTags(wrapper, rowData);
          }
          
          // Re-enable input if under max tags
          if (wrapper.querySelectorAll('.tag-chip').length < 5) {
            input.placeholder = '';
            input.disabled = false;
          }
        }
      }
    }
    
    function isTagAlreadyAdded(wrapper, tag) {
      const chips = wrapper.querySelectorAll('.tag-chip');
      return Array.from(chips).some(chip => {
        const textSpan = chip.querySelector('span:first-child');
        return textSpan && textSpan.textContent.trim() === tag;
      });
    }
    
    function updateRowTags(wrapper, row) {
      const chips = wrapper.querySelectorAll('.tag-chip');
      const tags = Array.from(chips).map(chip => {
        const textSpan = chip.querySelector('span:first-child');
        return textSpan ? textSpan.textContent.trim() : '';
      }).filter(tag => tag);
      row.tags = tags.join(',');
      
      // Add expanded class if 3+ tags
      if (tags.length >= 3) {
        wrapper.classList.add('expanded');
      } else {
        wrapper.classList.remove('expanded');
      }
      
      // Update the row in the state as well
      if (wrapper.closest('.row-income')) {
        const year = currentYear;
        const stateRowIndex = (state.income[year] || []).findIndex(stateRow => 
          stateRow.id === row.id || 
          (stateRow.name === row.name && stateRow.date === row.date)
        );
        
        if (stateRowIndex !== -1) {
          // Update the state row with the new tags
          state.income[year][stateRowIndex].tags = row.tags;
        }
        
        // Use direct save for tag removal to ensure immediate sync
        saveIncomeRowDirectly(row, year);
        
        // Force a small delay then refresh the UI to ensure sync
        setTimeout(() => {
          renderAll();
        }, 500);
      } else {
        save();
      }
    }
    
    function showTagSuggestions(input, wrapper) {
      hideTagSuggestions(wrapper); // Remove existing dropdown
      
      const dropdown = document.createElement('div');
      dropdown.className = 'tag-dropdown';
      
      // Get all existing tags from all income rows
      const allTags = getAllExistingTags();
      
      const inputValue = input.value.toLowerCase().trim();
      
      // Filter and show suggestions
      const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(inputValue) && 
        !isTagAlreadyAdded(wrapper, tag)
      ).slice(0, 8); // Limit to 8 suggestions
      
      
      if (filteredTags.length === 0) {
        return;
      }
      
      filteredTags.forEach(tag => {
        const suggestion = document.createElement('div');
        suggestion.className = 'tag-suggestion';
        suggestion.innerHTML = `
          <span>${tag}</span>
          <span class="tag-suggestion-count">${getTagCount(tag)}</span>
        `;
        suggestion.addEventListener('click', () => {
          if (!isTagAlreadyAdded(wrapper, tag)) {
            const chip = createTagChip(tag);
            wrapper.insertBefore(chip, input);
            
            // Use stored row data or find from DOM
            let rowData = wrapper.__rowData;
            if (!rowData) {
              const rowElement = input.closest('.row-income');
              if (rowElement && rowElement.__rowData) {
                rowData = rowElement.__rowData;
              }
            }
            
            if (rowData) {
              updateRowTags(wrapper, rowData);
            }
            input.value = '';
          }
          hideTagSuggestions(wrapper);
        });
        dropdown.appendChild(suggestion);
      });
      
      // Position dropdown based on available space
      positionDropdown(input, dropdown);
      
      // Append dropdown to the wrapper (relative positioning)
      wrapper.appendChild(dropdown);
      
      // Show dropdown
      setTimeout(() => {
        dropdown.classList.add('show');
      }, 10);
    }
    
    function hideTagSuggestions(wrapper) {
      const dropdown = wrapper.querySelector('.tag-dropdown');
      if (dropdown) {
        dropdown.remove();
      }
    }
    
    function getAllExistingTags() {
      const allTags = [];
      
      // Get tags from all income years
      Object.values(state.income).forEach(yearData => {
        yearData.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            allTags.push(...tags);
          }
        });
      });
      
      // Get tags from personal expenses
      if (state.personal) {
        state.personal.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            allTags.push(...tags);
          }
        });
      }
      
      // Get tags from business expenses
      if (state.biz) {
        state.biz.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            allTags.push(...tags);
          }
        });
      }
      
      // Count occurrences and return unique tags sorted by frequency
      const tagCounts = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
    }
    
    function getTagCount(tag) {
      let count = 0;
      
      // Count from income
      Object.values(state.income).forEach(yearData => {
        yearData.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(t => t.trim());
            if (tags.includes(tag)) count++;
          }
        });
      });
      
      // Count from personal expenses
      if (state.personal) {
        state.personal.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(t => t.trim());
            if (tags.includes(tag)) count++;
          }
        });
      }
      
      // Count from business expenses
      if (state.biz) {
        state.biz.forEach(row => {
          if (row.tags) {
            const tags = row.tags.split(',').map(t => t.trim());
            if (tags.includes(tag)) count++;
          }
        });
      }
      
      return count;
    }

  });

  // Custom Date Picker functionality
  let customDatePicker = null;
  let currentDatePickerInput = null;
  let currentDatePickerDate = new Date();
  let isDatePickerOpen = false;
  let datePickerTimeout = null;

  function initCustomDatePicker() {

    customDatePicker = document.getElementById('customDatePicker');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const clearDateBtn = document.getElementById('clearDate');
    const todayDateBtn = document.getElementById('todayDate');
    const datePickerDays = document.getElementById('datePickerDays');
    
    
    if (!customDatePicker) {

      return;
    }
    if (!monthSelect || !yearSelect) {

      return;
    }
    


    // Populate month select
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    months.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = month;
      monthSelect.appendChild(option);
    });

    // Populate year select (current year ± 10)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 10; year <= currentYear + 10; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }

    // Event listeners
    monthSelect.addEventListener('change', () => {
      currentDatePickerDate.setMonth(parseInt(monthSelect.value));
      renderDatePickerDays();
    });

    yearSelect.addEventListener('change', () => {
      currentDatePickerDate.setFullYear(parseInt(yearSelect.value));
      renderDatePickerDays();
    });

    prevMonthBtn.addEventListener('click', () => {
      currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() - 1);
      updateDatePickerHeader();
      renderDatePickerDays();
    });

    nextMonthBtn.addEventListener('click', () => {
      currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() + 1);
      updateDatePickerHeader();
      renderDatePickerDays();
    });

    clearDateBtn.addEventListener('click', () => {
      if (currentDatePickerInput) {
        currentDatePickerInput.value = '';
        currentDatePickerInput.dispatchEvent(new Event('change'));
      }
      hideCustomDatePicker();
    });

    todayDateBtn.addEventListener('click', () => {
      const today = new Date();
      selectDate(today);
    });

    // Close on backdrop click - not needed for dropdown
    // customDatePicker.addEventListener('click', (e) => {
    //   if (e.target === customDatePicker) {
    //     hideCustomDatePicker();
    //   }
    // });

    // Close date picker when clicking outside
    document.addEventListener('click', (e) => {
      if (customDatePicker.classList.contains('show') && 
          !e.target.closest('.custom-date-picker-modal') && 
          e.target.type !== 'date') {
        hideCustomDatePicker();
      }
    });
  }

  function showCustomDatePicker(inputElement) {

    
    // Prevent rapid opening/closing
    if (isDatePickerOpen) {

      return;
    }
    
    if (!customDatePicker) {

      return;
    }
    
    // Clear any existing timeout
    if (datePickerTimeout) {
      clearTimeout(datePickerTimeout);
    }
    
    // Add small delay to prevent rapid clicks
    datePickerTimeout = setTimeout(() => {
    currentDatePickerInput = inputElement;
    const currentValue = inputElement.value;
    
    if (currentValue) {
      const date = new Date(currentValue);
      if (!isNaN(date.getTime())) {
        currentDatePickerDate = date;
      }
    } else {
      currentDatePickerDate = new Date();
    }

    updateDatePickerHeader();
    renderDatePickerDays();
      
      // Simple positioning - just show it
      const datePickerModal = customDatePicker;
      
      // Reset all styles
      datePickerModal.style.position = 'fixed';
      datePickerModal.style.top = '50%';
      datePickerModal.style.left = '50%';
      datePickerModal.style.transform = 'translate(-50%, -50%)';
      datePickerModal.style.zIndex = '999999';
      datePickerModal.style.width = '240px';
      datePickerModal.style.display = 'block';
      
      // Make sure it's in the body
      if (datePickerModal.parentNode !== document.body) {
        document.body.appendChild(datePickerModal);
      }
      
      datePickerModal.classList.add('show');
      isDatePickerOpen = true;

      
      // Prevent body scroll when date picker is open
      document.body.style.overflow = 'hidden';
      
      // Add click handler to close when clicking backdrop
      const backdropClickHandler = (e) => {
        if (e.target === datePickerModal || e.target.classList.contains('custom-date-picker-modal')) {
          hideCustomDatePicker();
          datePickerModal.removeEventListener('click', backdropClickHandler);
        }
      };
      
      // Remove any existing handler first
      datePickerModal.removeEventListener('click', backdropClickHandler);
      datePickerModal.addEventListener('click', backdropClickHandler);
    }, 100); // 100ms delay
  }

  function hideCustomDatePicker() {
    if (!isDatePickerOpen) {
      return; // Already closed
    }
    
    customDatePicker.classList.remove('show');
    customDatePicker.style.display = 'none';
    currentDatePickerInput = null;
    isDatePickerOpen = false;
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear any pending timeout
    if (datePickerTimeout) {
      clearTimeout(datePickerTimeout);
      datePickerTimeout = null;
    }
  }

  function updateDatePickerHeader() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    monthSelect.value = currentDatePickerDate.getMonth();
    yearSelect.value = currentDatePickerDate.getFullYear();
  }

  function renderDatePickerDays() {
    const datePickerDays = document.getElementById('datePickerDays');
    datePickerDays.innerHTML = '';

    const year = currentDatePickerDate.getFullYear();
    const month = currentDatePickerDate.getMonth();
    const today = new Date();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      const dayElement = createDayElement(prevMonthDay.getDate(), true, false);
      datePickerDays.appendChild(dayElement);
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = currentDatePickerInput && 
        currentDatePickerInput.value === formatDateForInput(date);
      
      const dayElement = createDayElement(day, false, isToday, isSelected);
      datePickerDays.appendChild(dayElement);
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDay = new Date(year, month + 1, i);
      const dayElement = createDayElement(nextMonthDay.getDate(), true, false);
      datePickerDays.appendChild(dayElement);
    }
  }

  function createDayElement(day, isOtherMonth, isToday = false, isSelected = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'date-day';
    dayElement.textContent = day;
    
    if (isOtherMonth) {
      dayElement.classList.add('other-month');
    }
    if (isToday) {
      dayElement.classList.add('today');
    }
    if (isSelected) {
      dayElement.classList.add('selected');
    }

    if (!isOtherMonth) {
      dayElement.addEventListener('click', () => {
        const year = currentDatePickerDate.getFullYear();
        const month = currentDatePickerDate.getMonth();
        const selectedDate = new Date(year, month, day);
        selectDate(selectedDate);
      });
    }

    return dayElement;
  }

  function selectDate(date) {

    
    if (currentDatePickerInput) {
      // Get the actual date in YYYY-MM-DD format
      const actualDate = formatDateForInput(date);
      
      // Set the actual date value (this is what the form will use)
      currentDatePickerInput.value = actualDate;
      
      // Trigger change event to notify other parts of the app
      currentDatePickerInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Also trigger input event for real-time updates
      currentDatePickerInput.dispatchEvent(new Event('input', { bubbles: true }));
      

    }
    hideCustomDatePicker();
  }

  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  

  // Override default date input behavior
  function overrideDateInputs() {
    // Prevent default date input behavior more aggressively
    document.addEventListener('click', (e) => {
      if (e.target.type === 'date' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        e.stopPropagation();
        showCustomDatePicker(e.target);
        return false;
      }
    }, true);

    // Handle focus events
    document.addEventListener('focus', (e) => {
      if (e.target.type === 'date' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        e.stopPropagation();
        showCustomDatePicker(e.target);
        return false;
      }
    }, true);

    // Handle mousedown events
    document.addEventListener('mousedown', (e) => {
      if (e.target.type === 'date' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        e.stopPropagation();
        showCustomDatePicker(e.target);
        return false;
      }
    }, true);

    // Handle touch events for mobile
    document.addEventListener('touchstart', (e) => {
      if (e.target.type === 'date' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        e.stopPropagation();
        showCustomDatePicker(e.target);
        return false;
      }
    }, true);

    // Disable native date picker on all date inputs
    document.addEventListener('DOMContentLoaded', () => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      dateInputs.forEach(input => {
        input.addEventListener('focus', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showCustomDatePicker(input);
          return false;
        });
        
        input.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showCustomDatePicker(input);
          return false;
        });
        
        // Prevent native picker but keep icon visible
        input.style.cursor = 'pointer';
        input.addEventListener('focus', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showCustomDatePicker(input);
          return false;
        });
      });
    });
  }

  // Function to apply date picker overrides to new inputs
  function applyDatePickerToNewInputs() {
    const dateInputs = document.querySelectorAll('input[type="date"]:not([data-custom-picker-applied])');
    dateInputs.forEach(input => {
      input.setAttribute('data-custom-picker-applied', 'true');
      input.style.cursor = 'pointer';
      
      // Set placeholder text instead of clearing value
      input.placeholder = 'Select date';
      
      // Prevent all default behaviors with debouncing
      const debouncedShow = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDatePickerOpen) {
        showCustomDatePicker(input);
        }
        return false;
      };
      
      input.addEventListener('focus', debouncedShow);
      input.addEventListener('click', debouncedShow);
      input.addEventListener('mousedown', debouncedShow);
      input.addEventListener('keydown', debouncedShow);
      
      // Also add click handler to the parent container
      const container = input.closest('.date-input-wrapper') || input.parentElement;
      if (container) {
        container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCustomDatePicker(input);
        return false;
      });
      }
    });
  }

  // Function to position dropdown based on available space and row position
  function positionDropdown(trigger, menu) {
    const triggerRect = trigger.getBoundingClientRect();
    const menuHeight = 200; // Approximate menu height
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    
    // Check if this is in the last two rows of any table
    const isLastTwoRows = isInLastTwoRows(trigger);
    
    // Reset any previous positioning
    menu.style.top = '';
    menu.style.bottom = '';
    menu.style.transform = '';
    
    // Always position above for last two rows, or if there's not enough space below
    if (isLastTwoRows || (spaceBelow < menuHeight && spaceAbove > spaceBelow)) {
      // Position above the trigger
      menu.style.bottom = '100%';
      menu.style.top = 'auto';
      menu.style.transform = 'translateY(-4px)';
    } else {
      // Position below the trigger (default)
      menu.style.top = '100%';
      menu.style.bottom = 'auto';
      menu.style.transform = 'translateY(4px)';
    }
  }
  
  // Function to check if trigger is in the last two rows of any table
  function isInLastTwoRows(trigger) {
    // Find the table container
    const table = trigger.closest('.table');
    if (!table) return false;
    
    // Get all data rows (excluding header and sum rows)
    const dataRows = Array.from(table.querySelectorAll('.row:not(.row-head):not(.row-sum)'));
    if (dataRows.length < 2) return false;
    
    // Find the current row
    const currentRow = trigger.closest('.row:not(.row-head):not(.row-sum)');
    if (!currentRow) return false;
    
    // Get the index of current row
    const currentIndex = dataRows.indexOf(currentRow);
    
    // Check if it's in the last two rows
    return currentIndex >= dataRows.length - 2;
  }

  // Function to check if paid_egp field exists in database
  async function checkDatabaseSchema() {
    if (!currentUser || !supabaseReady) return false;
    
    try {
      // Try to select paid_egp field to see if it exists
      const { data, error } = await window.supabaseClient
        .from('income')
        .select('paid_egp')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {

        return false;
      }
      

      return true;
    } catch (error) {

      return false;
    }
  }

  // Initialize custom date picker when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    initCustomDatePicker();
    overrideDateInputs();
    applyDatePickerToNewInputs();
    
    
    // Initialize lock state
    if (typeof updateLockIcon === 'function') {
    updateLockIcon();
    }
    if (typeof updateInputsLockState === 'function') {
    updateInputsLockState();
    }
    
    // Initialize currency system
    try {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      if (savedCurrency && currencyRates && currencyRates[savedCurrency]) {
        state.selectedCurrency = savedCurrency;
        state.currencySymbol = currencySymbols[savedCurrency] || savedCurrency;
        state.currencyRate = currencyRates[savedCurrency];
        updateCurrency(savedCurrency);
      } else {
        // Initialize with default EGP
        state.selectedCurrency = 'EGP';
        state.currencySymbol = 'EGP';
        state.currencyRate = 48.1843;
      }
    } catch (error) {
      console.warn('Currency initialization failed:', error);
      // Fallback to EGP
      state.selectedCurrency = 'EGP';
      state.currencySymbol = 'EGP';
      state.currencyRate = 48.1843;
    }
    
    // Check database schema on load
    if (currentUser && supabaseReady) {
      checkDatabaseSchema();
    }
  });
  
  
  
  // Also add a simple click handler to any date input
  window.addEventListener('load', function() {
    setTimeout(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');

      
      dateInputs.forEach((input, index) => {
        input.addEventListener('click', function(e) {

          e.preventDefault();
          showCustomDatePicker(input);
        });
      });
    }, 1000);
  });

  // Re-apply date picker overrides when new content is added
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'INPUT' && node.type === 'date') {
              applyDatePickerToNewInputs();
            } else if (node.querySelectorAll) {
              const dateInputs = node.querySelectorAll('input[type="date"]');
              if (dateInputs.length > 0) {
                applyDatePickerToNewInputs();
              }
            }
          }
        });
      }
    });
  });

  // Only observe if document.body exists
  if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  }

  // Make duplicate check function globally available
  window.checkAndFixDuplicates = checkAndFixDuplicates;


