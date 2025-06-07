// DOM Elements
const menuTabs = document.getElementById('menuTabs');
const menuContainer = document.getElementById('menuContainer');
const loadingScreen = document.getElementById('loadingScreen');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const currentYear = document.getElementById('currentYear');

// Set current year in footer
currentYear.textContent = new Date().getFullYear();

// Fetch menu data from JSON
fetch('data/menu-data.json')
  .then(response => response.json())
  .then(data => {
    // Create menu tabs
    data.menuCategories.forEach(category => {
      const tab = document.createElement('div');
      tab.className = 'menu-tab';
      tab.setAttribute('data-target', category.id);

      tab.innerHTML = `
        <div class="icon-circle"><i class="fas ${category.icon}"></i></div>
        <span>${category.name}</span>
        <span class="category-count">${category.items.length}</span>
      `;

      menuTabs.appendChild(tab);
    });

    // Create menu sections
    data.menuCategories.forEach(category => {
      const section = document.createElement('section');
      section.id = category.id;
      section.className = 'menu-section';

      let itemsHTML = '';
      category.items.forEach(item => {
        itemsHTML += `
          <div class="menu-item" 
               data-name="${item.name}" 
               data-desc="${item.description}" 
               data-price="${item.price}" 
               data-img="${item.image}">
            <img src="${item.image}" alt="${item.name}" />
            <div class="menu-item-content">
              <h3>${item.name}</h3>
              <p>${item.price}</p>
            </div>
          </div>
        `;
      });

      section.innerHTML = `
        <h2>${category.name}</h2>
        <div class="menu-grid">${itemsHTML}</div>
      `;

      menuContainer.appendChild(section);
    });

    // Initialize after data is loaded
    initialize();
  })
  .catch(error => {
    console.error('Error loading menu data:', error);
    loadingScreen.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>حدث خطأ في تحميل القائمة. يرجى المحاولة لاحقاً.</p>
        <button onclick="window.location.reload()">إعادة المحاولة</button>
      </div>
    `;
  });

// Initialize all functionality
function initialize() {
  // Hide loading screen
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }, 1000);

  // Tab Navigation
  const tabs = document.querySelectorAll('.menu-tab');
  const sections = document.querySelectorAll('.menu-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);

      targetSection.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Scroll handler with active tab detection
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.pageYOffset + 150;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.id;
      }
    });

    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-target') === current) {
        tab.classList.add('active');
      }
    });

    // Show/hide scroll to top button
    if (window.pageYOffset > 300) {
      scrollTopBtn.style.display = 'block';
      setTimeout(() => {
        scrollTopBtn.classList.add('visible');
      }, 10);
    } else {
      scrollTopBtn.classList.remove('visible');
      setTimeout(() => {
        scrollTopBtn.style.display = 'none';
      }, 300);
    }
  });

  // Scroll to top button
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Modal functionality
  const modal = document.getElementById('itemModal');
  const modalImg = document.getElementById('modalImg');
  const modalName = document.getElementById('modalName');
  const modalDesc = document.getElementById('modalDesc');
  const modalPrice = document.getElementById('modalPrice');
  const modalClose = document.getElementById('modalClose');

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      modalImg.src = item.getAttribute('data-img');
      modalImg.alt = item.getAttribute('data-name');
      modalName.textContent = item.getAttribute('data-name');
      modalDesc.textContent = item.getAttribute('data-desc');
      modalPrice.textContent = item.getAttribute('data-price');

      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    });
  });

  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }, 300);
  }

  modalClose.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Intersection Observer for animations
  const animateOnScroll = (elements, className) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(className);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(element => observer.observe(element));
  };

  // Animate elements when they come into view
  animateOnScroll(document.querySelectorAll('.menu-tab'), 'visible');
  animateOnScroll(document.querySelectorAll('.menu-section'), 'visible');
  animateOnScroll(document.querySelectorAll('.menu-item'), 'visible');
}