// Updated configuration section for your admin.js file
// Replace the existing configuration section with this:

// Configuration - Server integration settings
const SERVER_ENDPOINT = '/api/save-menu'; // Your server endpoint
const USE_SERVER = true; // Set to true to enable server saving
const LOGIN_ENDPOINT = '/api/admin-login'; // Login endpoint
const MENU_DATA_ENDPOINT = '/api/menu-data'; // Get menu data endpoint

// Updated initializeData function to work with your server
async function initializeData() {
  try {
    // Load from server endpoint if available
    let response;

    if (USE_SERVER && MENU_DATA_ENDPOINT) {
      try {
        response = await fetch(MENU_DATA_ENDPOINT);
        if (response.ok) {
          menuData = await response.json();
          console.log('Loaded data from server');

          // Also save to localStorage as backup
          localStorage.setItem('menuData', JSON.stringify(menuData));
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (serverError) {
        console.warn('Failed to load from server, trying localStorage:', serverError);

        // Fallback to localStorage
        const localData = localStorage.getItem('menuData');
        if (localData) {
          menuData = JSON.parse(localData);
          console.log('Loaded data from localStorage (fallback)');
        } else {
          throw new Error('No data available in localStorage either');
        }
      }
    } else {
      // Original method - load from data.json directly
      response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      menuData = await response.json();
      console.log('Loaded data from data.json');

      // Save to localStorage for future use
      localStorage.setItem('menuData', JSON.stringify(menuData));
    }

    // Initialize the interface
    renderMenuItems();
    renderCategories();
    populateCategoryFilter();
    populateItemCategorySelect();

    // Set admin username if credentials exist
    if (menuData.adminCredentials) {
      const usernameField = document.getElementById('adminUsername');
      if (usernameField) {
        usernameField.value = menuData.adminCredentials.username;
      }
    }

  } catch (error) {
    console.error('Error loading menu data:', error);
    showNotification('حدث خطأ في تحميل البيانات. يرجى المحاولة لاحقاً.', 'error');

    // Initialize with default data structure if loading fails
    menuData = {
      adminCredentials: {
        username: 'admin',
        password: 'admin123'
      },
      menuCategories: []
    };

    // Try to save default data
    try {
      await saveData();
    } catch (saveError) {
      console.error('Could not save default data:', saveError);
    }
  }
}

// Updated saveData function with better error handling
async function saveData() {
  try {
    // Always save to localStorage first for immediate persistence
    localStorage.setItem('menuData', JSON.stringify(menuData));
    console.log('Data saved to localStorage');

    // If server integration is enabled, also save to server
    if (USE_SERVER && SERVER_ENDPOINT) {
      try {
        const response = await fetch(SERVER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(menuData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log('Data saved to server:', result);

        // Show success message only if server save succeeded
        return { success: true, message: 'Data saved successfully to server' };

      } catch (serverError) {
        console.error('Failed to save to server:', serverError);

        // Still show a notification but don't fail completely
        showNotification('تم الحفظ محلياً فقط. تعذر الاتصال بالخادم.', 'warning');
        return { success: false, error: serverError.message };
      }
    }

    return { success: true, message: 'Data saved locally' };
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

// Optional: Add server status check function
window.checkServerStatus = async function() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const status = await response.json();
      showNotification(`الخادم يعمل بشكل طبيعي - وقت التشغيل: ${Math.floor(status.uptime / 60)} دقيقة`, 'success');
      return true;
    }
  } catch (error) {
    showNotification('لا يمكن الوصول إلى الخادم', 'error');
    return false;
  }
};

// Optional: Add backup management functions
window.listBackups = async function() {
  try {
    const response = await fetch('/api/backups');
    if (response.ok) {
      const backups = await response.json();
      console.log('Available backups:', backups);
      return backups;
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    showNotification('تعذر جلب قائمة النسخ الاحتياطية', 'error');
  }
};

window.restoreBackup = async function(filename) {
  if (!confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية: ${filename}؟`)) {
    return;
  }

  try {
    const response = await fetch('/api/restore-backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename })
    });

    if (response.ok) {
      showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success');
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      throw new Error('Restore failed');
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    showNotification('تعذر استعادة النسخة الاحتياطية', 'error');
  }
};