// Global popup variable
const popup = document.getElementById('loginPromptPopup');

let scrollY;
let isAdmin = false;
let adminListenersAttached = false;
let movies = [];
let theaters = [];

// Function to show popup with animation
function showPopup() {
  if (!popup) return;
  popup.style.display = 'flex';
  // Force reflow for smooth animation
  void popup.offsetWidth;
  popup.classList.add('show');
  popup.classList.remove('hide');
}

// Function to hide popup with animation
function hidePopup() {
  if (!popup) return;
  popup.classList.add('hide');
  popup.classList.remove('show');
  setTimeout(() => {
    popup.style.display = 'none';
  }, 300);
}

// Admin Functions
async function checkAdminStatus() {
    const token = localStorage.getItem('token');
    console.log('Checking admin status, token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        isAdmin = false;
        console.log('No token found, setting isAdmin to false');
        return;
    }

    try {
        const response = await fetch('/api/auth/check-admin', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Admin check response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Admin check response data:', data);
            isAdmin = data.isAdmin;
            console.log('Setting isAdmin to:', isAdmin);
        } else {
            console.log('Admin check failed, setting isAdmin to false');
            isAdmin = false;
        }
    } catch (err) {
        console.error('Error checking admin status:', err);
        isAdmin = false;
    }
}

async function initializeApp() {
    await checkAdminStatus();
    if (isAdmin) {
        showAdminControls();
        // The event listeners are now set up within the DOMContentLoaded
        // after this async function completes.
    }
}

function showAdminControls() {
    if (!isAdmin) return;
    
    // Add delete buttons to existing content
    document.querySelectorAll('.content-item').forEach(item => {
        if (!item.querySelector('.admin-controls')) {
            const controls = document.createElement('div');
            controls.className = 'admin-controls';
            controls.innerHTML = '<button class="admin-delete-btn">×</button>';
            item.style.position = 'relative';
            item.appendChild(controls);
        }
    });

    // Add add buttons
    addAddButtons();
}

function addAddButtons() {
    // Add movie button
    if (!document.getElementById('addMovieBtnGrid')) {
        const addMovieBtn = document.createElement('button');
        addMovieBtn.id = 'addMovieBtnGrid';
        addMovieBtn.className = 'admin-add-btn';
        addMovieBtn.innerHTML = '+';
        addMovieBtn.onclick = () => showAdminModal('movie');
        const moviesList = document.getElementById('moviesList');
        if (moviesList) {
            moviesList.appendChild(addMovieBtn);
        }
    }

    // Add theater button
    if (!document.getElementById('addTheaterBtnGrid')) {
        const addTheaterBtn = document.createElement('button');
        addTheaterBtn.id = 'addTheaterBtnGrid';
        addTheaterBtn.className = 'admin-add-btn';
        addTheaterBtn.innerHTML = '+';
        addTheaterBtn.onclick = () => showAdminModal('theater');
        const theatersList = document.getElementById('theatersList');
        if (theatersList) {
            theatersList.appendChild(addTheaterBtn);
        }
    }
}

function showAdminModal(type) {
    console.log('showAdminModal called with type:', type);
    const modalId = `admin${type.charAt(0).toUpperCase() + type.slice(1)}Modal`;
    console.log('Looking for modal with ID:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal found:', modal ? 'Yes' : 'No');
    
    if (modal) {
        modal.classList.add('show');
        console.log('Modal shown:', modalId);
        if (type === 'show') {
            loadMoviesAndTheaters();
        }
        if (type === 'movie') {
            loadMoviesAndTheaters().then(() => {
                modal.classList.add('show');
                // Setup Assign New Theater button logic every time modal opens
                setTimeout(() => {
                    const assignTheaterBtn = document.getElementById('assignTheaterBtn');
                    const assignTheaterDropdown = document.getElementById('assignTheaterDropdown');
                    if (assignTheaterBtn && assignTheaterDropdown) {
                        assignTheaterBtn.onclick = () => {
                            if (assignTheaterDropdown.style.display === 'none' || assignTheaterDropdown.style.display === '') {
                                // Filter theaters: only those that do NOT have this movie assigned to any screen AND have at least one free screen
                                const freeTheaters = theaters.filter(theater =>
                                  !theater.screens.some(screen => screen.now_playing === movie.title) &&
                                  theater.screens.some(screen => !screen.now_playing)
                                );
                                let html = '<label>Select Theater:</label><select id="assignTheaterSelectModal"><option value="">-- Select Theater --</option>';
                                freeTheaters.forEach(theater => {
                                  html += `<option value="${theater._id}">${theater.name}</option>`;
                                });
                                html += '</select>';
                                html += '<div id="assignScreenDivModal" style="margin-top:8px;"></div>';
                                assignTheaterDropdown.innerHTML = html;
                                assignTheaterDropdown.style.display = 'block';
                                const theaterSelect = document.getElementById('assignTheaterSelectModal');
                                const screenDiv = document.getElementById('assignScreenDivModal');
                                theaterSelect.addEventListener('change', function() {
                                  const selectedId = this.value;
                                  if (!selectedId) {
                                    screenDiv.innerHTML = '';
                                    return;
                                  }
                                  const selectedTheater = theaters.find(t => t._id === selectedId);
                                  if (selectedTheater && selectedTheater.screens && selectedTheater.screens.length > 0) {
                                    // Only show screens that do NOT have any movie assigned
                                    const freeScreens = selectedTheater.screens.filter(screen => !screen.now_playing);
                                    let screenHtml = '<label>Select Screen:</label><select id="assignScreenSelectModal"><option value="">-- Select Screen --</option>';
                                    freeScreens.forEach(screen => {
                                      screenHtml += `<option value="${screen.screen_name}">${screen.screen_name}</option>`;
                                    });
                                    screenHtml += '</select>';
                                    if (freeScreens.length === 0) {
                                      screenHtml += '<em>No free screens available for this theater.</em>';
                                    }
                                    // Always add the Assign button
                                    screenHtml += '<button id="saveAssignMovieBtn" class="assign-btn">Assign</button>';
                                    screenDiv.innerHTML = screenHtml;
                                    // Add event listener for Assign button
                                    document.getElementById('saveAssignMovieBtn').onclick = async function() {
                                      const screenName = document.getElementById('assignScreenSelectModal').value;
                                      if (!screenName) { alert('Please select a free screen.'); return; }
                                      // Defensive check: ensure the screen is actually free
                                      const selectedScreen = selectedTheater.screens.find(s => s.screen_name === screenName);
                                      if (!selectedScreen || selectedScreen.now_playing) {
                                        alert('This screen is already assigned to another movie. Please select a free screen.');
                                        return;
                                      }
                                      try {
                                        const token = localStorage.getItem('token');
                                        // Assign movie to screen (set now_playing)
                                        const assignRes = await fetch(`/api/theaters/${selectedTheater._id}/screens/${encodeURIComponent(screenName)}/assign`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                          body: JSON.stringify({ movie_title: movie.title })
                                        });
                                        if (!assignRes.ok) {
                                          const data = await assignRes.json();
                                          alert(data.msg || 'Failed to assign movie to screen.');
                                          return;
                                        }
                                        alert('Movie assigned to screen!');
                                        assignTheaterDropdown.style.display = 'none';
                                        await loadMoviesAndTheaters();
                                        closeModalFunc();
                                        renderMovies();
                                      } catch (e) { alert('Failed to assign movie to screen.'); }
                                    };
                                  } else {
                                    screenDiv.innerHTML = '<em>No screens available for this theater.</em><button id="saveAssignMovieBtn" class="assign-btn">Assign</button>';
                                    document.getElementById('saveAssignMovieBtn').onclick = function() {
                                      alert('No free screens available for this theater.');
                                    };
                                  }
                                });
                            } else {
                                assignTheaterDropdown.style.display = 'none';
                            }
                        };
                    }
                }, 0);
            });
            return;
        }
    } else {
        console.error('Modal not found for type:', type);
    }
}

function hideAdminModal(type) {
    const modal = document.getElementById(`admin${type.charAt(0).toUpperCase() + type.slice(1)}Modal`);
    if (modal) {
        modal.classList.remove('show');
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
    // Remove header dimming
    const header = document.querySelector('header');
    if (header) header.classList.remove('header-disabled');
}

async function loadMoviesAndTheaters() {
    try {
        const [moviesResponse, theatersResponse] = await Promise.all([
            fetch('/api/movies'),
            fetch('/api/theaters')
        ]);
        
        // Update global variables
        movies = await moviesResponse.json();
        theaters = await theatersResponse.json();
        
        const movieSelect = document.getElementById('showMovie');
        const theaterSelect = document.getElementById('showTheater');
        
        if (movieSelect) {
            movieSelect.innerHTML = '<option value="">Select Movie</option>';
            movies.forEach(movie => {
                const option = document.createElement('option');
                option.value = movie._id;
                option.textContent = movie.title;
                movieSelect.appendChild(option);
            });
        }
        
        if (theaterSelect) {
            theaterSelect.innerHTML = '<option value="">Select Theater</option>';
            theaters.forEach(theater => {
                const option = document.createElement('option');
                option.value = theater._id;
                option.textContent = theater.name;
                theaterSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error loading movies and theaters:', err);
    }
}

function addTimeInput() {
    const container = document.getElementById('showTimes');
    const timeInput = document.createElement('div');
    timeInput.className = 'admin-time-input';
    timeInput.innerHTML = `
        <input type="time" value="11:00">
        <button type="button" class="remove-time-btn">×</button>
    `;
    container.appendChild(timeInput);
    
    timeInput.querySelector('.remove-time-btn').addEventListener('click', () => {
        if (container.children.length > 1) {
            container.removeChild(timeInput);
        }
    });
}

function addDateInput() {
    const container = document.getElementById('showDates');
    const dateInput = document.createElement('div');
    dateInput.className = 'admin-date-input';
    dateInput.innerHTML = `
        <input type="date" value="">
        <button type="button" class="remove-date-btn">×</button>
    `;
    container.appendChild(dateInput);
    
    dateInput.querySelector('.remove-date-btn').addEventListener('click', () => {
        if (container.children.length > 1) {
            container.removeChild(dateInput);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, starting initialization...");

  function setupAdminEventListeners() {
    if (adminListenersAttached) {
        return;
    }
    console.log("Attaching admin event listeners...");
    // Close buttons
    document.getElementById('closeMovieModal')?.addEventListener('click', () => hideAdminModal('movie'));
    document.getElementById('closeTheaterModal')?.addEventListener('click', () => hideAdminModal('theater'));
    document.getElementById('closeShowModal')?.addEventListener('click', () => hideAdminModal('show'));
    
    // Form submissions
    document.getElementById('adminMovieForm')?.addEventListener('submit', handleAddMovie);
    document.getElementById('adminTheaterForm')?.addEventListener('submit', handleAddTheater);
    document.getElementById('adminShowForm')?.addEventListener('submit', handleAddShow);
    
    // Time and date management
    document.getElementById('addTimeBtn')?.addEventListener('click', addTimeInput);
    document.getElementById('addDateBtn')?.addEventListener('click', addDateInput);
    
    // Confirm modal
    document.getElementById('adminConfirmNo')?.addEventListener('click', hideConfirmModal);
    
    // File input labels
    setupFileInputs();
    adminListenersAttached = true;
  }

  function setupFileInputs() {
      document.querySelectorAll('.admin-file-input input[type="file"]').forEach(input => {
          input.addEventListener('change', function() {
              const label = this.nextElementSibling;
              if (this.files.length > 0) {
                  label.textContent = this.files[0].name;
              } else {
                  label.textContent = 'Choose JPG file or drag here';
              }
          });
      });
  }

  async function handleAddMovie(e) {
    e.preventDefault();
    console.log('[handleAddMovie] Form submitted.');

    const formData = new FormData();
    formData.append('title', document.getElementById('movieTitle').value);
    formData.append('synopsis', document.getElementById('movieSynopsis').value);
    formData.append('price', document.getElementById('moviePrice').value);
    
    const posterFile = document.getElementById('moviePoster').files[0];
    if (posterFile) {
        formData.append('poster', posterFile);
        console.log('[handleAddMovie] Poster file attached:', posterFile.name);
    }
    
    try {
        const token = localStorage.getItem('token');
        console.log('[handleAddMovie] Using token:', token);
        
        const response = await fetch('/api/movies', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        console.log(`[handleAddMovie] Server responded with status: ${response.status}`);
        
        const responseText = await response.text();
        console.log('[handleAddMovie] Raw response text:', responseText);

        if (response.ok) {
            console.log('[handleAddMovie] Response is OK (2xx status).');
            const newMovie = JSON.parse(responseText);
            hideAdminModal('movie');
            
            movies.push(newMovie);
            movies.sort((a, b) => a.title.localeCompare(b.title));
            renderMovies();
            
            alert('Movie added successfully!');
        } else {
            console.error('[handleAddMovie] Response is NOT OK.');
            try {
                const error = JSON.parse(responseText);
                console.error('[handleAddMovie] Parsed JSON error response:', error);
                alert(error.msg || 'Error adding movie. Check console for details.');
            } catch (e) {
                console.error('[handleAddMovie] Could not parse response text as JSON.');
                alert('An unknown error occurred. Check console for the raw response.');
            }
        }
    } catch (err) {
        console.error('[handleAddMovie] An error occurred in the fetch promise chain:', err);
        alert('A critical error occurred. Check console for details.');
    }
  }

  async function handleAddTheater(e) {
      e.preventDefault();
      
      const formData = new FormData();
      formData.append('name', document.getElementById('theaterName').value);
      formData.append('address', document.getElementById('theaterAddress').value);
      formData.append('price', document.getElementById('theaterPrice').value);
      
      const photoFile = document.getElementById('theaterPhoto').files[0];
      if (photoFile) {
          formData.append('photo', photoFile);
      }
      
      try {
          const response = await fetch('/api/theaters', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
          });
          
          if (response.ok) {
              const newTheater = await response.json();
              hideAdminModal('theater');

              // Optimistic UI update
              theaters.push(newTheater);
              theaters.sort((a, b) => a.name.localeCompare(b.name));
              
              // Find the city from the new theater's address and select it
              const newAddress = newTheater.address || '';
              const cityInAddress = cities.find(c => newAddress.toLowerCase().includes(c.toLowerCase()));
              
              // Debug logs
              console.log('New theater added:', newTheater);
              console.log('All theaters:', theaters);
              console.log('All cities:', cities);
              console.log('City detected in address:', cityInAddress);
              console.log('Currently selected city:', selectedCity.textContent);
              
              if (cityInAddress) {
                  selectCity(cityInAddress);
              }

              // Ensure the theaters section is visible before rendering
              showSection('theaters'); 
              
              alert('Theater added successfully!');
          } else {
              const error = await response.json();
              alert(error.msg || 'Error adding theater');
          }
      } catch (err) {
          console.error('Error adding theater:', err);
          alert('Error adding theater');
      }
  }

  async function handleAddShow(e) {
      e.preventDefault();
      
      const times = Array.from(document.querySelectorAll('#showTimes input[type="time"]'))
          .map(input => input.value)
          .filter(time => time);
      
      const dates = Array.from(document.querySelectorAll('#showDates input[type="date"]'))
          .map(input => input.value)
          .filter(date => date);
      
      if (times.length === 0 || dates.length === 0) {
          alert('Please add at least one time and one date');
          return;
      }
      
      const showData = {
          movieId: document.getElementById('showMovie').value,
          theaterId: document.getElementById('showTheater').value,
          screen: document.getElementById('showScreen').value,
          price: document.getElementById('showPrice').value,
          times: times,
          dates: dates
      };
      
      try {
          const response = await fetch('/api/shows', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(showData)
          });
          
          if (response.ok) {
              const result = await response.json();
              hideAdminModal('show');
              alert(result.msg);
          } else {
              const error = await response.json();
              alert(error.msg || 'Error scheduling shows');
          }
      } catch (err) {
          console.error('Error scheduling shows:', err);
          alert('Error scheduling shows');
      }
  }

  function showConfirmModal(title, message, onConfirm) {
      document.getElementById('adminConfirmTitle').textContent = title;
      document.getElementById('adminConfirmMessage').textContent = message;
      document.getElementById('adminConfirmModal').classList.add('show');
      
      const yesBtn = document.getElementById('adminConfirmYes');
      yesBtn.onclick = () => {
          onConfirm();
          hideConfirmModal();
      };
  }

  function hideConfirmModal() {
      document.getElementById('adminConfirmModal').classList.remove('show');
  }

  async function deleteItem(type, id, name) {
      showConfirmModal(
          `Delete ${type}`,
          `Are you sure you want to delete "${name}"? This action cannot be undone.`,
          async () => {
              try {
                  const response = await fetch(`/api/${type}s/${id}`, {
                      method: 'DELETE',
                      headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                      }
                  });
                  
                  if (response.ok) {
                      // Optimistic UI update
                      if (type === 'movie') {
                          movies = movies.filter(m => m._id !== id);
                          renderMovies();
                      } else if (type === 'theater') {
                          theaters = theaters.filter(t => t._id !== id);
                          renderTheaters();
                      }
                      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
                  } else {
                      const error = await response.json();
                      console.error(`Delete ${type} error:`, error);
                      alert(error.msg || `Error deleting ${type}`);
                  }
              } catch (err) {
                  console.error(`Error deleting ${type}:`, err);
                  alert(`Error deleting ${type}`);
              }
          }
      );
  }

  // Get elements
  const logoContainer = document.querySelector(".logo-container");
  const xMark = document.getElementById("xMark");
  const sideMenuOverlay = document.getElementById("sideMenuOverlay");
  
  const header = document.querySelector('header');

  function updateHeaderShadow() {
    if (document.body.classList.contains('side-menu-open')) {
      header.classList.add('sticky-shadow');
    } else if (window.scrollY > 1) {
      header.classList.add('sticky-shadow');
    } else {
      header.classList.remove('sticky-shadow');
    }
  }

  // window.addEventListener('scroll', updateHeaderShadow);

  // Function to close menu and revert logo
  const closeMenu = () => {
    // Add closing class for rotation animation
    logoContainer.classList.add("closing");
    
    // Close menu immediately with the animation
    sideMenu.classList.remove("show");
    sideMenuOverlay.classList.remove("show");
    document.documentElement.classList.remove('side-menu-open');
    document.body.classList.remove('side-menu-open');
    // updateHeaderShadow();
    if (typeof scrollY !== 'undefined') {
        window.scrollTo(0, scrollY);
    }
    
    // Wait for animation to complete before removing classes
    setTimeout(() => {
      logoContainer.classList.remove("active");
      logoContainer.classList.remove("closing");
    }, 300);
  };

  // Function to open menu and show X mark
  const openMenu = () => {
    debugger;
    scrollY = window.scrollY;
    document.body.style.setProperty('--scroll-y', scrollY);
    sideMenu.classList.add("show");
    sideMenuOverlay.classList.add("show");
    // document.documentElement.classList.add('side-menu-open');
    document.body.classList.add('side-menu-open');
    logoContainer.classList.add("active");
    // updateHeaderShadow();
  };
  
  // Simple toggle functionality
  if (logoContainer && sideMenu) {
    // Logo click handler
    logoContainer.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu();
    });

    // X mark click handler
    xMark.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    });

    // Close menu when clicking overlay
    sideMenuOverlay.addEventListener("click", () => {
      closeMenu();
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!logoContainer.contains(e.target) && !sideMenu.contains(e.target)) {
        if (sideMenu.classList.contains("show")) {
            closeMenu();
        }
      }
    });
  }

  // Navigation and content elements
  const browseMoviesLink = document.getElementById("browseMoviesLink");
  const browseTheatersLink = document.getElementById("browseTheatersLink");
  const moviesContent = document.getElementById("moviesContent");
  const theatersContent = document.getElementById("theatersContent");
  const moviesListDiv = document.getElementById("moviesList");
  const theatersListDiv = document.getElementById("theatersList");

  // Location elements
  const locationWrapper = document.getElementById("locationWrapper");
  const dropdown = document.getElementById("dropdownMenu");
  const searchInput = document.getElementById("searchInput");
  const cityList = document.getElementById("cityList");
  const selectedCity = document.getElementById("selectedCity");
  const locationIconImg = document.getElementById("locationIconImg");

  // Modal elements
  const modalOverlay = document.getElementById("modalOverlay");
  const modalDetails = document.getElementById("modalDetails");
  const closeModal = document.getElementById("closeModal");

  // Bookings Modal elements
  const bookingsModalOverlay = document.getElementById("bookingsModalOverlay");
  const bookingsModalContent = document.getElementById("bookingsModalContent");
  const bookingsModalDetails = document.getElementById("bookingsModalDetails");
  const closeBookingsModal = document.getElementById("closeBookingsModal");

  // Auth Modal Logic
  const authItem = document.getElementById('authItem');
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const aboutSection = document.getElementById('aboutSection');
  const authModalBody = document.querySelector('.auth-modal-body');

  let filteredCities = [];
  let cities = [];

  function toggleDropdown() {
    locationWrapper.classList.add("clicked");
    dropdown.classList.toggle("show");
    if(dropdown.classList.contains("show")) {
      searchInput.value="";
      renderCities();
      setTimeout(()=>searchInput.focus(),50);
    }
    setTimeout(()=>{locationWrapper.classList.remove("clicked");},100);
  }

  // Add click outside handler for dropdown
  document.addEventListener('click', (e) => {
    if (dropdown.classList.contains('show') && 
        !dropdown.contains(e.target) && 
        !locationWrapper.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  function saveSelectedCity(city) {
    sessionStorage.setItem("selectedCity", city);
  }

  function loadSelectedCity() {
    return sessionStorage.getItem("selectedCity");
  }

  function renderCities(filter = "") {
    cityList.innerHTML = "";
    filteredCities = cities.filter(city => city.toLowerCase().includes(filter.toLowerCase()));
    highlightIndex = -1;

    filteredCities.forEach((city, index) => {
      const item = document.createElement("div");
      item.className = "city-option";
      item.setAttribute("data-index", index);
      item.innerHTML = filter
        ? city.replace(new RegExp(filter, "i"), match => `<span class="highlight">${match}</span>`)
        : city;
      item.addEventListener("click", () => selectCity(city));
      cityList.appendChild(item);
    });
  }

  function selectCity(city) {
    selectedCity.textContent = city;
    saveSelectedCity(city);
    dropdown.classList.remove("show");
    searchInput.value = "";
    renderCities();
    if (theatersContent.classList.contains("slide-in-right")) {
      renderTheaters();
    }
  }

  function openModal(content) {
    scrollY = window.scrollY;
    document.body.style.setProperty('--scroll-y', scrollY);
    modalDetails.innerHTML = content;
    modalOverlay.classList.remove("hidden");
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    setTimeout(() => modalOverlay.classList.add("show"), 10);
    // Disable header interactions
    const header = document.querySelector('header');
    if (header) header.classList.add('header-disabled');
  }

  function closeModalFunc() {
    modalOverlay.classList.remove("show");
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    if (typeof scrollY !== 'undefined') {
        window.scrollTo(0, scrollY);
    }
    setTimeout(() => modalOverlay.classList.add("hidden"), 300);
    // Re-enable header interactions
    const header = document.querySelector('header');
    if (header) header.classList.remove('header-disabled');
  }

  function setActiveNavLink(activeLink) {
    browseMoviesLink.classList.remove("active");
    browseTheatersLink.classList.remove("active");
    activeLink.classList.add("active");
  }

  function showSection(sectionId) {
    // Remove all animation classes
    moviesContent.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");
    theatersContent.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");

    const isMoviesVisible = !moviesContent.classList.contains("hidden");
    const isTheatersVisible = !theatersContent.classList.contains("hidden");

    // Step 1: Apply OUT animation (but DON'T hide yet)
    if (sectionId === "movies" && isTheatersVisible) {
      theatersContent.classList.add("slide-out-right");
    } else if (sectionId === "theaters" && isMoviesVisible) {
      moviesContent.classList.add("slide-out-left");
    }

    // Step 2: Wait for out animation to finish
    setTimeout(() => {
      // Actually hide both after the out animation is done
      moviesContent.classList.add("hidden");
      theatersContent.classList.add("hidden");
      moviesContent.style.opacity = '0';
      theatersContent.style.opacity = '0';

      // Remove exit classes so they don't stack
      moviesContent.classList.remove("slide-out-left", "slide-out-right");
      theatersContent.classList.remove("slide-out-left", "slide-out-right");

      // Step 3: Show new section with IN animation
      if (sectionId === "movies") {
        moviesContent.classList.remove("hidden");
        renderMovies();
        setTimeout(() => {
          moviesContent.style.opacity = '1';
          moviesContent.classList.add("slide-in-left");
        }, 10);
        setActiveNavLink(browseMoviesLink);
      } else if (sectionId === "theaters") {
        theatersContent.classList.remove("hidden");
        renderTheaters();
        setTimeout(() => {
          theatersContent.style.opacity = '1';
          theatersContent.classList.add("slide-in-right");
        }, 10);
        setActiveNavLink(browseTheatersLink);
      }
    }, 130);
  }

  function removeAdminControls() {
    document.querySelectorAll('.admin-controls').forEach(el => el.remove());
    document.getElementById('addMovieBtnGrid')?.remove();
    document.getElementById('addTheaterBtnGrid')?.remove();
  }

  async function toggleHoldStatus(type, id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/${type}s/${id}/hold`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const updatedItem = await response.json();
            // Update the local arrays
            if (type === 'movie') {
                const index = movies.findIndex(m => m._id === id);
                if (index !== -1) movies[index] = updatedItem;
                renderMovies();
            } else if (type === 'theater') {
                const index = theaters.findIndex(t => t._id === id);
                if (index !== -1) theaters[index] = updatedItem;
                renderTheaters();
            }
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} status updated.`);
        } else {
            const error = await response.json();
            alert(error.msg || `Error updating ${type} status.`);
        }
    } catch (err) {
        console.error(`Error toggling ${type} hold status:`, err);
        alert(`A critical error occurred while updating ${type} status.`);
    }
  }

  function renderMovies() {
    const moviesListDiv = document.getElementById("moviesList");
    if (!moviesListDiv) return;

    // Remove admin controls for non-admins
    if (!isAdmin) removeAdminControls();

    moviesListDiv.innerHTML = "";
    movies.forEach(movie => {
      const movieItem = document.createElement("div");
      movieItem.className = "content-item";
      if (movie.onHold) {
        movieItem.classList.add('on-hold');
      }
      movieItem.style.position = "relative";

      const posterImg = document.createElement("img");
      posterImg.src = movie.poster_url || "posters/fallback.jpg";
      posterImg.alt = `${movie.title} poster`;
      posterImg.className = "movie-poster";
      posterImg.onerror = () => posterImg.src = "posters/fallback.jpg";

      const titleSpan = document.createElement("span");
      titleSpan.className = "movie-title";
      titleSpan.textContent = movie.title;

      movieItem.appendChild(posterImg);
      movieItem.appendChild(titleSpan);

      // Add admin controls if user is admin
      if (isAdmin) {
        const adminControls = document.createElement("div");
        adminControls.className = "admin-controls";
        const holdIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><line x1="6.5" y1="17.5" x2="17.5" y2="6.5" stroke="currentColor" stroke-width="2"/></svg>`;
        const holdClass = movie.onHold ? 'admin-unhold-btn' : 'admin-hold-btn';
        adminControls.innerHTML = `
            <button class="${holdClass}" data-id="${movie._id}">${holdIcon}</button>
            <button class="admin-edit-btn" data-id="${movie._id}" data-type="movie">✎</button>
            <button class="admin-delete-btn" data-id="${movie._id}" data-name="${movie.title}">×</button>
        `;
        movieItem.appendChild(adminControls);

        adminControls.querySelector(`.${holdClass}`).addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHoldStatus('movie', movie._id);
        });

        adminControls.querySelector('.admin-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAdminEditModal('movie', movie);
        });

        adminControls.querySelector('.admin-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteItem('movie', movie._id, movie.title);
        });
      }

      movieItem.addEventListener("click", () => {
        const city = selectedCity.textContent;
        const matchingTheaters = theaters.filter(theater =>
          theater.address.includes(city) &&
          theater.screens.some(screen => screen.now_playing === movie.title)
        );

        let content = `
          <h3>${movie.title}</h3>
          <div class="modal-flex">
          <img src="${movie.poster_url}" class="movie-poster">
          <div class="modal-details-right">
            <div class="synopsis">${movie.synopsis}</div>`;

        if (city === "Select city") {
          content += `<p id="selectCityPrompt" style="cursor: pointer; text-decoration: underline;">Select a city to see available theaters</p>`;
        }
        else if (matchingTheaters.length === 0 || city!=="Rajahmundry") {
          content += `<p>Currently not available in ${city}</p>`;
        }
        else {
          content += `<div class="playing-info"><strong>Available at:</strong>`;
          matchingTheaters.forEach(theater => {
            const movieOnHold = movie.onHold;
            const theaterOnHold = theater.onHold;
            theater.screens.forEach(screen => {
              if (screen.now_playing === movie.title) {
                const onHold = movieOnHold || theaterOnHold;
                content += `
                  <div class="screen-info">
                  <button type="button" class="book-movie-btn"
                    data-movie="${movie.title}"
                    data-theater="${theater.name}"
                    data-screen="${screen.screen_name}"
                    data-source="movies"
                    data-poster="${movie.poster_url}"
                    ${onHold ? 'disabled title="This show is temporarily on hold"' : ''}>
                    ${theater.name} - ${screen.screen_name} ${onHold ? '(On Hold)' : ''}
                  </button>
                  </div>`;
              }
            });
          });
        }

        content += `</div></div></div>`;    
        if (isAdmin) {
          content += `
            <div class="admin-form-group" id="assignTheaterGroupModal">
              <button type="button" id="assignTheaterBtnModal" class="admin-submit-btn" style="margin-bottom: 8px;">Assign New Theater</button>
              <div id="assignTheaterDropdownModal" style="display:none; margin-top: 8px;"></div>
            </div>
          `;
        }
        openModal(content);
        setTimeout(() => {
          const prompt = document.getElementById("selectCityPrompt");
          if (prompt) {
            prompt.addEventListener("click", () => {
              // Close modal overlay with animation and then show dropdown
              modalOverlay.classList.remove("show");
              setTimeout(() => {
                modalOverlay.classList.add("hidden");
                // Re-enable scrolling and pointer events
                document.documentElement.classList.remove('modal-open');
                document.body.classList.remove('modal-open');
                // Remove header dimming if present
                const header = document.querySelector('header');
                if (header) header.classList.remove('header-disabled');
                // Now open dropdown and focus
                if (!dropdown.classList.contains("show")) {
                  dropdown.classList.add("show");
                }
                searchInput.focus();
              }, 300);
            });
          }
          // Assign New Theater logic for modal
          if (isAdmin) {
            const assignTheaterBtn = document.getElementById('assignTheaterBtnModal');
            const assignTheaterDropdown = document.getElementById('assignTheaterDropdownModal');
            if (assignTheaterBtn && assignTheaterDropdown) {
              assignTheaterBtn.onclick = () => {
                if (assignTheaterDropdown.style.display === 'none' || assignTheaterDropdown.style.display === '') {
                  // Filter theaters: show if at least one free screen (regardless of other screens assigned)
                  const freeTheaters = theaters.filter(theater =>
                    theater.screens.some(screen => !screen.now_playing)
                  );
                  let html = '<label>Select Theater:</label><select id="assignTheaterSelectModal"><option value="">-- Select Theater --</option>';
                  freeTheaters.forEach(theater => {
                    html += `<option value="${theater._id}">${theater.name}</option>`;
                  });
                  html += '</select>';
                  html += '<div id="assignScreenDivModal" style="margin-top:8px;"></div>';
                  assignTheaterDropdown.innerHTML = html;
                  assignTheaterDropdown.style.display = 'block';
                  const theaterSelect = document.getElementById('assignTheaterSelectModal');
                  const screenDiv = document.getElementById('assignScreenDivModal');
                  theaterSelect.addEventListener('change', function() {
                    const selectedId = this.value;
                    if (!selectedId) {
                      screenDiv.innerHTML = '';
                      return;
                    }
                    const selectedTheater = theaters.find(t => t._id === selectedId);
                    if (selectedTheater && selectedTheater.screens && selectedTheater.screens.length > 0) {
                      // Only show screens that do NOT have any movie assigned
                      const freeScreens = selectedTheater.screens.filter(screen => !screen.now_playing);
                      let screenHtml = '<label>Select Screen:</label><select id="assignScreenSelectModal"><option value="">-- Select Screen --</option>';
                      freeScreens.forEach(screen => {
                        screenHtml += `<option value="${screen.screen_name}">${screen.screen_name}</option>`;
                      });
                      screenHtml += '</select>';
                      if (freeScreens.length === 0) {
                        screenHtml += '<em>No free screens available for this theater.</em>';
                      }
                      // Always add the Assign button
                      screenHtml += '<button id="saveAssignMovieBtn" class="assign-btn">Assign</button>';
                      screenDiv.innerHTML = screenHtml;
                      // Add event listener for Assign button
                      document.getElementById('saveAssignMovieBtn').onclick = async function() {
                        const screenName = document.getElementById('assignScreenSelectModal').value;
                        if (!screenName) { alert('Please select a free screen.'); return; }
                        // Defensive check: ensure the screen is actually free
                        const selectedScreen = selectedTheater.screens.find(s => s.screen_name === screenName);
                        if (!selectedScreen || selectedScreen.now_playing) {
                          alert('This screen is already assigned to another movie. Please select a free screen.');
                          return;
                        }
                        try {
                          const token = localStorage.getItem('token');
                          // Assign movie to screen (set now_playing)
                          const assignRes = await fetch(`/api/theaters/${selectedTheater._id}/screens/${encodeURIComponent(screenName)}/assign`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ movie_title: movie.title })
                          });
                          if (!assignRes.ok) {
                            const data = await assignRes.json();
                            alert(data.msg || 'Failed to assign movie to screen.');
                            return;
                          }
                          alert('Movie assigned to screen!');
                          assignTheaterDropdown.style.display = 'none';
                          await loadMoviesAndTheaters();
                          closeModalFunc();
                          renderMovies();
                        } catch (e) { alert('Failed to assign movie to screen.'); }
                      };
                    } else {
                      screenDiv.innerHTML = '<em>No screens available for this theater.</em><button id="saveAssignMovieBtn" class="assign-btn">Assign</button>';
                      document.getElementById('saveAssignMovieBtn').onclick = function() {
                        alert('No free screens available for this theater.');
                      };
                    }
                  });
                } else {
                  assignTheaterDropdown.style.display = 'none';
                }
              };
            }
          }
        }, 20);
      });

      moviesListDiv.appendChild(movieItem);
    });

    // Add admin controls after rendering
    if (isAdmin) {
      showAdminControls();
    }
  }

  function renderTheaters() {
    const theatersListDiv = document.getElementById("theatersList");
    if (!theatersListDiv) return;

    // Remove admin controls for non-admins
    if (!isAdmin) removeAdminControls();

    theatersListDiv.innerHTML = "";
    const city = document.getElementById("selectedCity").textContent;

    const cityTheaters = theaters.filter(theater => theater.address.includes(city));

    if (cityTheaters.length === 0) {
      const message = document.createElement("div");
      message.className = "no-theaters-message";
      message.textContent = "Currently no available theaters";
      theatersListDiv.appendChild(message);
      return;
    }

    cityTheaters.forEach(theater => {
      const theaterItem = document.createElement("div");
      theaterItem.className = "content-item";
      if (theater.onHold) {
        theaterItem.classList.add('on-hold');
      }
      theaterItem.style.position = "relative";

      const photo = document.createElement("img");
      photo.src = theater.photo_url || "posters/fallbacktheater.jpg";
      photo.alt = `${theater.name} photo`;
      photo.className = "theater-photo";
      photo.onerror = () => photo.src = "posters/fallbacktheater.jpg";

      const nameSpan = document.createElement("span");
      nameSpan.className = "theater-name";
      nameSpan.textContent = theater.name;

      theaterItem.appendChild(photo);
      theaterItem.appendChild(nameSpan);

      // Add admin controls if user is admin
      if (isAdmin) {
        const adminControls = document.createElement("div");
        adminControls.className = "admin-controls";
        const holdIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><line x1="6.5" y1="17.5" x2="17.5" y2="6.5" stroke="currentColor" stroke-width="2"/></svg>`;
        const holdClass = theater.onHold ? 'admin-unhold-btn' : 'admin-hold-btn';
        adminControls.innerHTML = `
            <button class="${holdClass}" data-id="${theater._id}">${holdIcon}</button>
            <button class="admin-edit-btn" data-id="${theater._id}" data-type="theater">✎</button>
            <button class="admin-delete-btn" data-id="${theater._id}" data-name="${theater.name}">×</button>
        `;
        theaterItem.appendChild(adminControls);

        adminControls.querySelector(`.${holdClass}`).addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHoldStatus('theater', theater._id);
        });

        adminControls.querySelector('.admin-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAdminEditModal('theater', theater);
        });

        adminControls.querySelector('.admin-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteItem('theater', theater._id, theater.name);
        });
      }

      theaterItem.addEventListener("click", () => {
        let content = `<h3>${theater.name}</h3>
        <div class="modal-flex">
          <img src="${theater.photo_url}" class="theater-photo">
          <div class="modal-details-right">
          <div class="address">${theater.address}</div>
          <div class="playing-info">
            <strong>Now Showing:</strong>`;
        theater.screens.forEach(screen => {
          let movieTitle = (screen.now_playing || '').trim();
          const screenName = (screen.screen_name && screen.screen_name !== 'undefined') ? screen.screen_name : '';
          const movieData = movies.find(m => m.title === movieTitle);
          const movieOnHold = movieData ? movieData.onHold : false;
          const posterUrl = movieData ? movieData.poster_url : "posters/fallback.jpg";
          const theaterOnHold = theater.onHold;
          const onHold = theaterOnHold || movieOnHold;
          // If movieData is missing, treat as no movie assigned
          const showRemoveBtn = isAdmin && movieTitle && movieData;
          const showTitle = movieData ? movieTitle : '';
          content += `\n            <div class="screen-info">\n              ${screenName}: <button type="button" class="book-movie-btn"\n              data-movie="${showTitle}"\n              data-theater="${theater.name}"\n              data-screen="${screenName}"\n              data-source="theaters"\n              data-poster="${posterUrl}"\n              ${(showTitle && !onHold) ? '' : 'disabled'}\n              ${onHold ? 'title=\"This show is temporarily on hold\"' : ''}>\n              ${showTitle ? showTitle : 'No Movie Assigned'} ${onHold ? '(On Hold)' : ''}\n            </button>\n            ${showRemoveBtn ? `<button type=\"button\" class=\"remove-movie-btn\" data-theater-id=\"${theater._id}\" data-screen-name=\"${screenName}\">Remove Movie</button>` : ''}\n            </div>`;
        });
        content += `</div></div></div>`;
        if (isAdmin) {
          content += `
            <div class="admin-form-group" id="theaterAdminActionsModal">
              <button type="button" id="addScreenBtnModal" class="admin-submit-btn" style="margin-bottom: 8px;">Add Screen</button>
              <button type="button" id="assignMovieBtnModal" class="admin-submit-btn" style="margin-bottom: 8px;">Assign Movie</button>
              <div id="theaterAdminDropdownModal" style="display:none; margin-top: 8px;"></div>
            </div>
          `;
        }
        openModal(content);
        setTimeout(() => {
          if (isAdmin) {
            const addScreenBtn = document.getElementById('addScreenBtnModal');
            const assignMovieBtn = document.getElementById('assignMovieBtnModal');
            const adminDropdown = document.getElementById('theaterAdminDropdownModal');
            if (addScreenBtn && adminDropdown) {
              addScreenBtn.onclick = async () => {
                adminDropdown.innerHTML = '<input type="text" id="newScreenNameInput" placeholder="Screen Name"><button id="saveNewScreenBtn" class="save-btn">Save</button>';
                adminDropdown.style.display = 'block';
                document.getElementById('saveNewScreenBtn').onclick = async () => {
                  const screenName = document.getElementById('newScreenNameInput').value.trim();
                  if (!screenName) { alert('Enter a screen name.'); return; }
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/theaters/${theater._id}/screens`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ screen_name: screenName })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert('Screen added!');
                      adminDropdown.style.display = 'none';
                      await loadMoviesAndTheaters();
                      closeModalFunc();
                      renderTheaters();
                    } else {
                      alert(data.msg || 'Failed to add screen.');
                    }
                  } catch (e) { alert('Failed to add screen.'); }
                };
              };
            }
            if (assignMovieBtn && adminDropdown) {
              assignMovieBtn.onclick = () => {
                let html = '<label>Select Movie:</label><select id="assignMovieSelectModal"><option value="">-- Select Movie --</option>';
                movies.forEach(movie => {
                  html += `<option value="${movie._id}">${movie.title}</option>`;
                });
                html += '</select>';
                html += '<label>Select Screen:</label><select id="assignScreenSelectModal"><option value="">-- Select Screen --</option>';
                theaters.find(t => t._id === theater._id).screens.forEach(screen => {
                  html += `<option value="${screen.screen_name}">${screen.screen_name}</option>`;
                });
                html += '</select>';
                html += '<button id="saveAssignMovieBtn" class="save-btn">Assign</button>';
                adminDropdown.innerHTML = html;
                adminDropdown.style.display = 'block';
                document.getElementById('saveAssignMovieBtn').onclick = async () => {
                  const movieId = document.getElementById('assignMovieSelectModal').value;
                  const screenName = document.getElementById('assignScreenSelectModal').value;
                  if (!movieId || !screenName) { alert('Select both movie and screen.'); return; }
                  const selectedMovie = movies.find(m => m._id === movieId);
                  // Defensive check: ensure the screen is actually free
                  const selectedScreen = theaters.find(t => t._id === theater._id).screens.find(s => s.screen_name === screenName);
                  if (!selectedScreen || selectedScreen.now_playing) {
                    alert('This screen is already assigned to another movie. Please select a free screen.');
                    return;
                  }
                  try {
                    const token = localStorage.getItem('token');
                    // Assign movie to screen (set now_playing)
                    const assignRes = await fetch(`/api/theaters/${theater._id}/screens/${encodeURIComponent(screenName)}/assign`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ movie_title: selectedMovie.title })
                    });
                    if (!assignRes.ok) {
                      const data = await assignRes.json();
                      alert(data.msg || 'Failed to assign movie to screen.');
                      return;
                    }
                    if(assignRes.ok){

                      alert('Movie assigned to screen!');
                      adminDropdown.style.display = 'none';
                      await loadMoviesAndTheaters();
                      closeModalFunc();
                      renderTheaters();
                    }
                    
                  } catch (e) { alert('Failed to assign movie to screen.'); }
                };
              };
            }
          }
        }, 20);
      });

      theatersListDiv.appendChild(theaterItem);
    });

    // Add admin controls after rendering
    if (isAdmin) {
      showAdminControls();
    }
  }

  // Event listeners
  modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) {
      closeModalFunc();
    }
  });

  closeModal.addEventListener("click", closeModalFunc);
  selectedCity.addEventListener("click", toggleDropdown);
  locationIconImg.addEventListener("click", toggleDropdown);
  searchInput.addEventListener("input", () => renderCities(searchInput.value));

  // Bookings modal event listeners
  bookingsModalOverlay.addEventListener("click", e => {
    if (e.target === bookingsModalOverlay) {
      closeBookingsModalFunc();
    }
  });

  closeBookingsModal.addEventListener("click", closeBookingsModalFunc);

  // Event delegation for download ticket buttons inside the bookings modal
  bookingsModalDetails.addEventListener('click', e => {
    if (e.target && e.target.classList.contains('ticket-download-btn')) {
        const button = e.target;
        const { bookingId, movie, theater, screen, seats, date, time } = button.dataset;
        
        // Find movie poster from the movies array
        const movieData = movies.find(m => m.title === movie);
        const posterUrl = movieData ? movieData.poster_url : "posters/fallback.jpg";
        
        // Calculate total price (₹200 per seat)
        const seatsArray = seats.split(', ');
        const totalPrice = seatsArray.length * 200;

        // Call the centralized download function
        downloadTicketAsImage({
            movie,
            posterUrl,
            theater,
            screen,
            seats,
            date,
            time,
            totalPrice
        });
    }
  });

  try {
    // Step 1: Fetch data from MongoDB
    const [cityData, movieData, theaterData] = await Promise.all([
      fetch('/api/cities').then(res => res.json()),
      fetch('/api/movies').then(res => res.json()),
      fetch('/api/theaters').then(res => res.json())
    ]);

    cities = cityData.map(c => c.name).sort();
    movies = movieData.sort((a, b) => a.title.localeCompare(b.title));
    theaters = theaterData.sort((a, b) => a.name.localeCompare(b.name));

    // Step 2: Load and set saved city
    const savedCity = loadSelectedCity();
    if (savedCity && cities.includes(savedCity)) {
      selectedCity.textContent = savedCity;
    }

    // Step 3: Render city dropdown
    renderCities();

    // Step 4: Setup nav links
    browseMoviesLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Movies link clicked'); // Debug log
      showSection('movies');
    });

    browseTheatersLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Theaters link clicked'); // Debug log
      if (selectedCity.textContent === 'Select city') {
        alert('Select a city first.');
      } else {
        showSection('theaters');
      }
    });

    // Step 6: Check for section parameter and initialize accordingly
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    
    if (section === 'theaters') {
        if (selectedCity.textContent === 'Select city') {
            // If no city selected, show movies instead and alert
            moviesContent.classList.remove('hidden');
            moviesContent.style.opacity = '1';
            setActiveNavLink(browseMoviesLink);
            renderMovies();
            alert('Please select a city to view theaters.');
        } else {
            // Show theaters section
            showSection('theaters');
        }
    } else {
        // Default to movies section
        moviesContent.classList.remove('hidden');
        moviesContent.style.opacity = '1';
        setActiveNavLink(browseMoviesLink);
        renderMovies();
    }

    // Clean up URL parameter
    if (section) {
        const url = new URL(window.location);
        url.searchParams.delete('section');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }

  } catch (err) {
    console.error("App init error:", err);
    // Fallback: Show movies section even if API fails
    moviesContent.classList.remove('hidden');
    moviesContent.style.opacity = '1';
    setActiveNavLink(browseMoviesLink);
    
    // Add some dummy data for testing
    movies = [
      { title: "Test Movie 1", poster_url: "posters/fallback.jpg", synopsis: "Test synopsis" },
      { title: "Test Movie 2", poster_url: "posters/fallback.jpg", synopsis: "Test synopsis" }
    ];
    renderMovies();
  }

    // Auth Modal Logic
    function setAuthForm(formToShow) {
      const forms = [loginForm, signupForm];
      forms.forEach(f => {
        f.classList.remove('active', 'inactive');
        f.classList.add(f === formToShow ? 'active' : 'inactive');
      });
      
      // Simple height adjustment without complex calculations
      setTimeout(() => {
        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
          // Simple height calculation
          let extraPadding = activeForm === signupForm ? 15 : 10;
          const errorHeight = 25; // Reserve space for error
          const computedHeight = activeForm.scrollHeight + extraPadding + errorHeight;
          authModalBody.style.height = computedHeight + 'px';
        }
      }, 10); // Reduced timeout for smoother transition
    }  
    // On modal open, always show login form first
    function showAuthModal() {
      // Always reset to login tab and form
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      
      // Reset modal body height before setting form
      authModalBody.style.height = 'auto';
      
      // Clear any existing error messages first
      clearError(loginForm);
      clearError(signupForm);
      
      setAuthForm(loginForm);
      
      // Close side menu and overlay if open
      const sideMenu = document.getElementById('sideMenu');
      const sideMenuOverlay = document.getElementById('sideMenuOverlay');
      const logoContainer = document.querySelector('.logo-container');
      
      if (sideMenu && sideMenu.classList.contains('show')) {
        closeMenu();
      }
      
      // Show modal and trigger scaleIn animation on content
      scrollY = window.scrollY;
      document.body.style.setProperty('--scroll-y', scrollY);
      authModal.style.display = 'flex';
      const modalContent = authModal.querySelector('.auth-modal-content');
      if (modalContent) {
        modalContent.style.animation = 'scaleIn 0.3s cubic-bezier(.4,0,.2,1) forwards';
      }
      setTimeout(() => authModal.classList.add('show'), 10);
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  
    function hideAuthModal() {
      const modalContent = authModal.querySelector('.auth-modal-content');
      if (modalContent) {
        // Trigger scaleOut animation on content
        modalContent.style.animation = 'scaleOut 0.3s cubic-bezier(.4,0,.2,1) forwards';
      }
    
      // Remove show class after animation duration
      setTimeout(() => {
        authModal.classList.remove('show');
        authModal.style.display = 'none';
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        if (typeof scrollY !== 'undefined') {
            window.scrollTo(0, scrollY);
        }
      
        // Reset modal heights
        authModalBody.style.height = 'auto';
      
        if (modalContent) {
          modalContent.style.animation = '';
        }
      
        // Clear any error messages
        clearError(loginForm);
        clearError(signupForm);
      
        // Reset forms
        loginForm.reset();
        signupForm.reset();
      
        const logoContainer = document.querySelector('.logo-container');
        if (sideMenu && sideMenu.classList.contains('show')) {
          sideMenu.classList.remove('show');
          if (sideMenuOverlay) sideMenuOverlay.classList.remove('show');
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          if (logoContainer) {
            logoContainer.classList.add('closing');
            setTimeout(() => {
              logoContainer.classList.remove('active');
              logoContainer.classList.remove('closing');
            }, 300);
          }
        }
      }, 300);
    }  authItem.addEventListener('click', showAuthModal);
  closeAuthModal.addEventListener('click', hideAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) hideAuthModal();
  });
  document.addEventListener('keydown', (e) => {
    if (authModal.classList.contains('show') && e.key === 'Escape') hideAuthModal();
  });
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    setAuthForm(loginForm);
  });
  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    setAuthForm(signupForm);
  });
  // Placeholder for login/signup logic and updating menu after auth
  function setLoggedInUI()
  {
    const user = JSON.parse(localStorage.getItem('user'));
    localStorage.setItem('isLoggedIn', 'true');
    
    // Check admin status
    checkAdminStatus().then(() => {
      // Use the side menu content container directly
      const sideMenuContent = document.querySelector('.side-menu-content');
      if (!sideMenuContent) return; // Fail gracefully if not present
      
      let menuContent = `
        <div id="userInfo" class="side-menu-item">
          <div class="user-icon">👤</div>
          <span id="userEmail">${user.name}</span>
        </div>
        <div id="bookingsItem" class="side-menu-item dropdown-item">
          <div class="dropdown-header">
            <span>My Bookings</span>
            <span class="dropdown-arrow">▼</span>
          </div>
          <div class="dropdown-content">
            <div id="currentBookingsBtn" class="dropdown-option">Current Bookings</div>
            <div id="pastBookingsBtn" class="dropdown-option">Past Bookings</div>
          </div>
        </div>
        <div id="accountItem" class="side-menu-item dropdown-item">
          <div class="dropdown-header">
            <span>Account</span>
            <span class="dropdown-arrow">▼</span>
          </div>
          <div class="dropdown-content">
            <div id="changeNameBtn" class="dropdown-option">Change User Name</div>
            <div id="changePasswordBtn" class="dropdown-option">Change Password</div>
            <div id="deleteAccountBtn" class="dropdown-option">Delete Account</div>
          </div>
        </div>`;
      
      // Add admin section if user is admin
      if (isAdmin) {
        menuContent += `
          <div id="adminItem" class="side-menu-item dropdown-item">
            <div class="dropdown-header">
              <span>Admin Panel</span>
              <span class="dropdown-arrow">▼</span>
            </div>
            <div class="dropdown-content">
              <div id="addMovieBtn" class="dropdown-option">Add Movie</div>
              <div id="addTheaterBtn" class="dropdown-option">Add Theater</div>
              <div id="scheduleShowBtn" class="dropdown-option">Schedule Show</div>
            </div>
          </div>`;
      } else {
        removeAdminControls();
      }
      
      menuContent += `<div id="logoutBtn" class="side-menu-item">
        <span>Logout</span>
      </div>`;
      
      sideMenuContent.innerHTML = menuContent;
      
      // Setup admin event listeners
      if (isAdmin) {
        setupAdminEventListeners();
        setupAdminMenuListeners();
      }
      
      // Setup regular event listeners
      setupRegularEventListeners();

      // Re-render the current section to show admin controls immediately
      if (isAdmin) {
        if (moviesContent && !moviesContent.classList.contains('hidden')) {
            renderMovies();
        } else if (theatersContent && !theatersContent.classList.contains('hidden')) {
            renderTheaters();
        }
      }
    });
  }

  function setLoggedOutUI() {
    localStorage.setItem('isLoggedIn', 'false');
    removeAdminControls();
    
    const sideMenuContent = document.querySelector('.side-menu-content');
    sideMenuContent.innerHTML = `
      <div id="authItem" class="side-menu-item">
        <span>Log In / Sign Up</span>
      </div>
    `;
    
    // Add click handler for auth item
    setTimeout(() => {
      const newAuthItem = document.getElementById('authItem');
      newAuthItem.addEventListener('click', showAuthModal);
    }, 100);
  }

  // Login prompt popup buttons event listeners
  if (popup) {
    // Close button
    const closeBtn = document.getElementById('closeLoginPrompt');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        hidePopup();
        e.stopPropagation();
      });
    }

    // Login/Signup button
    const openAuthBtn = document.getElementById('openAuthModalFromPrompt');
    if (openAuthBtn) {
      openAuthBtn.addEventListener('click', (e) => {
        hidePopup();
        if (typeof showAuthModal === 'function') showAuthModal();
        e.stopPropagation();
      });
    }

    // Overlay click (only if clicking the overlay itself)
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        hidePopup();
      }
    });

    // Prevent overlay click from closing when clicking inside content
    const content = popup.querySelector('.login-prompt-content');
    if (content) {
      content.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Book movie button handler
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("book-movie-btn") && !e.target.disabled) {
      if (localStorage.getItem('isLoggedIn') !== 'true') {
        // Show login prompt popup
        const popup = document.getElementById('loginPromptPopup');
        if (popup) showPopup();
        e.preventDefault();
        return;
      }
      // User is logged in, proceed as normal
      const movie = e.target.dataset.movie;
      const theater = e.target.dataset.theater;
      const screen = e.target.dataset.screen;
      const source = e.target.dataset.source || "movies";
      const poster = e.target.dataset.poster || "";
      const queryString = `?movie=${encodeURIComponent(movie)}&theater=${encodeURIComponent(theater)}&screen=${encodeURIComponent(screen)}&source=${encodeURIComponent(source)}&poster=${encodeURIComponent(poster)}`;
      window.location.href = `booking.html${queryString}`;
    }
  });

  // Add global event listener for login prompt popup
  document.addEventListener('DOMContentLoaded', function() {
    if (window.location.search.includes('loginPrompt=1')) {
      var popup = document.getElementById('loginPromptPopup');
      if (popup) popup.style.display = 'flex';

      // Global event delegation for close and login buttons
      document.body.addEventListener('click', function(e) {
        // Close button
        if (e.target && e.target.id === 'closeLoginPrompt') {
          if (popup) popup.style.display = 'none';
          var url = new URL(window.location);
          url.searchParams.delete('loginPrompt');
          window.history.replaceState({}, document.title, url.pathname + url.search);
          e.stopPropagation();
        }
        // Login/Signup button
        if (e.target && e.target.id === 'openAuthModalFromPrompt') {
          if (popup) popup.style.display = 'none';
          if (typeof showAuthModal === 'function') showAuthModal();
          var url = new URL(window.location);
          url.searchParams.delete('loginPrompt');
          window.history.replaceState({}, document.title, url.pathname + url.search);
          e.stopPropagation();
        }
      });

      // Overlay click (only if clicking the overlay itself)
      if (popup) popup.addEventListener('click', function(e) {
        if (e.target === popup) {
          popup.style.display = 'none';
          var url = new URL(window.location);
          url.searchParams.delete('loginPrompt');
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      });

      // Prevent overlay click from closing when clicking inside content
      var content = document.querySelector('.login-prompt-content');
      if (content) {
        content.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }
    }
  });

  // Function to show error message in forms
  function showError(form, message) {
    const errorDiv = form.querySelector('.auth-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  // Function to clear error message
  function clearError(form) {
    const errorDiv = form.querySelector('.auth-error');
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }

  // Handle signup form submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(signupForm);

    const name = signupForm.querySelector('input[type="text"]').value;
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = signupForm.querySelectorAll('input[type="password"]')[1].value;

    // Validate passwords match
    if (password !== confirmPassword) {
      showError(signupForm, 'Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Signup successful - switch to login tab with success message
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        setAuthForm(loginForm);
        clearError(signupForm);
        signupForm.reset();
        
        // Show success message in login form
        const loginError = loginForm.querySelector('.auth-error');
        loginError.textContent = 'Account created successfully! Please log in.';
        loginError.style.display = 'block';
        loginError.style.color = '#4CAF50'; // Green color for success
        
        // Clear the success message after 3 seconds
        setTimeout(() => {
          loginError.style.display = 'none';
          loginError.style.color = ''; // Reset color
        }, 3000);
        
      } else {
        showError(signupForm, data.msg || 'Signup failed');
      }
    } catch (error) {
      showError(signupForm, 'Server error. Please try again.');
    }
  });

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginForm);

    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data and token
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update UI
        setLoggedInUI();
        hideAuthModal();
        loginForm.reset();

        // Redirect to booking page or default page
        // Removed automatic redirect after login to stay on same page
        // Redirect will happen only when booking buttons are clicked
        // const urlParams = new URLSearchParams(window.location.search);
        // const movie = urlParams.get('movie');
        // const theater = urlParams.get('theater');
        // const screen = urlParams.get('screen');
        // const source = urlParams.get('source');

        // let redirectUrl = 'booking.html';
        // if (movie && theater && screen) {
        //   redirectUrl += `?movie=${encodeURIComponent(movie)}&theater=${encodeURIComponent(theater)}&screen=${encodeURIComponent(screen)}`;
        //   if (source) {
        //     redirectUrl += `&source=${encodeURIComponent(source)}`;
        //   }
        // }
        // window.location.href = redirectUrl;
      } else {
        showError(loginForm, data.msg || 'Login failed');
      }
    } catch (error) {
      showError(loginForm, 'Server error. Please try again.');
    }
  });

  // Check initial auth state
  if (localStorage.getItem('user')) {
    setLoggedInUI();
  } else {
    setLoggedOutUI();
  }

  // --- Change Password Modal ---
  function showChangePasswordModal() {
    // Remove any existing modal
    let modal = document.getElementById('changePasswordModal');
    if (!modal) {
      // Create modal only if it doesn't exist
      modal = document.createElement('div');
      modal.id = 'changePasswordModal';
      modal.className = 'auth-modal'; // No 'show' initially
      document.body.appendChild(modal);
    }
    // Set modal content
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h2>Change Password</h2>
          <button class="close-auth-modal" id="closeChangePasswordModal">&times;</button>
        </div>
        <div class="auth-modal-body">
          <form id="changePasswordForm" class="auth-form active">
            <input type="password" placeholder="Current Password" required autocomplete="current-password">
            <input type="password" placeholder="New Password" required autocomplete="new-password">
            <input type="password" placeholder="Confirm New Password" required autocomplete="new-password">
            <button type="submit" class="save-btn">Change Password</button>
            <div class="auth-error"></div>
          </form>
        </div>
      </div>
    `;
    scrollY = window.scrollY;
    document.body.style.setProperty('--scroll-y', scrollY);
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    // Animate open in the next animation frame for smoothness
    modal.classList.remove('show');
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
    // Close logic
    document.getElementById('closeChangePasswordModal').onclick = () => {
      const modalContent = modal.querySelector('.auth-modal-content');
      if (modalContent) {
        modalContent.classList.add('scale-out');
        // Force reflow to ensure animation is applied
        void modalContent.offsetWidth;
        modal.classList.remove('show');
        // Remove modal after animation ends
        const removeModal = () => {
          modalContent.removeEventListener('animationend', removeModal);
          modalContent.classList.remove('scale-out');
          modal.remove();
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          if (typeof scrollY !== 'undefined') {
            window.scrollTo(0, scrollY);
          }
        };
        modalContent.addEventListener('animationend', removeModal);
      } else {
        modal.remove();
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        if (typeof scrollY !== 'undefined') {
            window.scrollTo(0, scrollY);
        }
      }
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        const modalContent = modal.querySelector('.auth-modal-content');
        if (modalContent) {
          modalContent.classList.add('scale-out');
          void modalContent.offsetWidth;
          modal.classList.remove('show');
          const removeModal = () => {
            modalContent.removeEventListener('animationend', removeModal);
            modalContent.classList.remove('scale-out');
            modal.remove();
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
            if (typeof scrollY !== 'undefined') {
                window.scrollTo(0, scrollY);
            }
          };
          modalContent.addEventListener('animationend', removeModal);
        } else {
          modal.remove();
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          if (typeof scrollY !== 'undefined') {
            window.scrollTo(0, scrollY);
          }
        }
      }
    };
    // Submit logic
    const form = document.getElementById('changePasswordForm');
    const errorDiv = form.querySelector('.auth-error');
    form.onsubmit = async function(ev) {
      ev.preventDefault();
      errorDiv.textContent = '';
      const [current, next, confirm] = form.querySelectorAll('input[type="password"]');
      if (next.value !== confirm.value) {
        errorDiv.textContent = 'New passwords do not match';
        errorDiv.style.visibility = 'visible';
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword: current.value, newPassword: next.value })
        });
        const data = await res.json();
        if (res.ok) {
          errorDiv.style.color = '#4CAF50';
          errorDiv.textContent = 'Password changed successfully!';
          setTimeout(() => {
            const modalContent = modal.querySelector('.auth-modal-content');
            if (modalContent) {
              modalContent.classList.add('scale-out');
              void modalContent.offsetWidth;
              modal.classList.remove('show');
              const removeModal = () => {
                modalContent.removeEventListener('animationend', removeModal);
                modalContent.classList.remove('scale-out');
                modal.remove();
                document.documentElement.classList.remove('modal-open');
                document.body.classList.remove('modal-open');
                if (typeof scrollY !== 'undefined') {
                    window.scrollTo(0, scrollY);
                }
              };
              modalContent.addEventListener('animationend', removeModal);
            } else {
              modal.remove();
              document.documentElement.classList.remove('modal-open');
              document.body.classList.remove('modal-open');
              if (typeof scrollY !== 'undefined') {
                  window.scrollTo(0, scrollY);
              }
            }
          }, 1200);
        } else {
          errorDiv.style.color = '#ff6b6b';
          errorDiv.textContent = data.msg || 'Failed to change password';
        }
      } catch (err) {
        errorDiv.style.color = '#ff6b6b';
        errorDiv.textContent = 'Server error';
      }
    };
  }
  // --- Delete Account Popup ---
  function showDeleteAccountPopup() {
    // Remove any existing popup
    let popup = document.getElementById('deleteAccountPopup');
    if (popup) popup.remove();
    // Create popup
    popup = document.createElement('div');
    popup.id = 'deleteAccountPopup';
    popup.className = 'login-prompt-popup show';
    popup.innerHTML = `
      <div class="login-prompt-content">
        <span id="closeDeleteAccountPopup" class="login-prompt-close">&times;</span>
        <div class="login-prompt-message">Are you sure you want to delete your account? This will delete all your bookings and cannot be undone.</div>
        <button id="confirmDeleteAccount" class="delete-account-btn";">Delete Account</button>
      </div>
    `;
    document.body.appendChild(popup);
    // Close logic
    document.getElementById('closeDeleteAccountPopup').onclick = () => popup.remove();
    popup.onclick = (e) => { if (e.target === popup) popup.remove(); };
    // Confirm delete
    document.getElementById('confirmDeleteAccount').onclick = async function() {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/auth/delete-account', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.setItem('isLoggedIn', 'false');
          popup.remove();
          setLoggedOutUI();
          alert('Account deleted successfully.');
        } else {
          alert(data.msg || 'Failed to delete account');
          popup.remove();
        }
      } catch (err) {
        alert('Server error');
        popup.remove();
      }
    };
  }

  function openBookingsModal() {
    bookingsModalDetails.innerHTML = `
      <div class="bookings-tabs">
        <button class="booking-tab active" data-tab="current">Current Bookings</button>
        <button class="booking-tab" data-tab="past">Past Bookings</button>
      </div>
      <div class="bookings-content-wrapper">
        <div id="currentBookingsContent" class="bookings-content active">
          <div class="no-bookings-message">Loading current bookings...</div>
        </div>
        <div id="pastBookingsContent" class="bookings-content">
          <div class="no-bookings-message">Loading past bookings...</div>
        </div>
      </div>
    `;
    
    scrollY = window.scrollY;
    document.body.style.setProperty('--scroll-y', scrollY);
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    bookingsModalOverlay.classList.remove("hidden");
    setTimeout(() => bookingsModalOverlay.classList.add("show"), 10);
    
    // Load current bookings by default
    loadCurrentBookings();
    
    // Add tab click handlers
    setTimeout(() => {
      const tabs = bookingsModalDetails.querySelectorAll('.booking-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabType = tab.dataset.tab;
          switchBookingsTab(tabType);
        });
      });
    }, 100);
  }

  function closeBookingsModalFunc() {
    bookingsModalOverlay.classList.remove("show");
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    if (typeof scrollY !== 'undefined') {
        window.scrollTo(0, scrollY);
    }
    setTimeout(() => bookingsModalOverlay.classList.add("hidden"), 300);
  }

  function switchBookingsTab(tabType) {
    // Update active tab
    const tabs = bookingsModalDetails.querySelectorAll('.booking-tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabType) {
        tab.classList.add('active');
      }
    });

    // Update active content
    const contents = bookingsModalDetails.querySelectorAll('.bookings-content');
    contents.forEach(content => {
      content.classList.remove('active');
    });

    if (tabType === 'current') {
      document.getElementById('currentBookingsContent').classList.add('active');
      loadCurrentBookings();
    } else {
      document.getElementById('pastBookingsContent').classList.add('active');
      loadPastBookings();
    }
  }

  async function loadCurrentBookings() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        document.getElementById('currentBookingsContent').innerHTML = 
          '<div class="no-bookings-message">Please log in to view your bookings.</div>';
        return;
      }

      const response = await fetch('/api/bookings/user/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        displayBookings(data.bookings, 'currentBookingsContent');
      } else {
        document.getElementById('currentBookingsContent').innerHTML = 
          '<div class="no-bookings-message">Error loading bookings. Please try again.</div>';
      }
    } catch (error) {
      console.error('Error loading current bookings:', error);
      document.getElementById('currentBookingsContent').innerHTML = 
        '<div class="no-bookings-message">Error loading bookings. Please try again.</div>';
    }
  }

  async function loadPastBookings() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        document.getElementById('pastBookingsContent').innerHTML = 
          '<div class="no-bookings-message">Please log in to view your bookings.</div>';
        return;
      }

      const response = await fetch('/api/bookings/user/past', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        displayBookings(data.bookings, 'pastBookingsContent');
      } else {
        document.getElementById('pastBookingsContent').innerHTML = 
          '<div class="no-bookings-message">Error loading bookings. Please try again.</div>';
      }
    } catch (error) {
      console.error('Error loading past bookings:', error);
      document.getElementById('pastBookingsContent').innerHTML = 
        '<div class="no-bookings-message">Error loading bookings. Please try again.</div>';
    }
  }

  function displayBookings(bookings, containerId) {
    const container = document.getElementById(containerId);
    
    if (!bookings || bookings.length === 0) {
      container.innerHTML = '<div class="no-bookings-message">No bookings found.</div>';
      return;
    }

    const bookingsHTML = bookings.map(booking => {
      const bookingDate = new Date(booking.date);
      const formattedDate = bookingDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Calculate total price (₹200 per seat)
      const totalPrice = booking.seats.length * 200;
      
      // Find movie poster from the movies array
      const movieData = movies.find(m => m.title === booking.movie);
      const posterUrl = movieData ? movieData.poster_url : "posters/fallback.jpg";

      return `
        <div class="booking-card">
          <div class="booking-header">
            <div class="booking-poster">
              <img src="${posterUrl}" alt="${booking.movie} poster" class="booking-movie-poster" onerror="this.src='posters/fallback.jpg'">
            </div>
            <div class="booking-movie-info">
              <div class="booking-movie-title">${booking.movie}</div>
              <div class="booking-theater">${booking.theater}</div>
              <div class="booking-screen">${booking.screen}</div>
            </div>
          </div>
          <div class="booking-details">
            <div class="booking-detail-item">
              <div class="booking-detail-label">Date</div>
              <div class="booking-detail-value">${formattedDate}</div>
            </div>
            <div class="booking-detail-item">
              <div class="booking-detail-label">Time</div>
              <div class="booking-detail-value">${booking.time}</div>
            </div>
            <div class="booking-detail-item">
              <div class="booking-detail-label">Seats</div>
              <div class="booking-detail-value">${booking.seats.length}</div>
            </div>
            <div class="booking-detail-item">
              <div class="booking-detail-label">Total Price</div>
              <div class="booking-detail-value">₹${totalPrice}</div>
            </div>
          </div>
          <div class="booking-seats">
            <div class="booking-seats-label">Booked Seats:</div>
            <div class="booking-seats-list">${booking.seats.join(', ')}</div>
          </div>
          <div class="booking-actions">
            <button class="ticket-download-btn"
              data-booking-id="${booking._id}"
              data-movie="${booking.movie}"
              data-theater="${booking.theater}"
              data-screen="${booking.screen}"
              data-seats="${booking.seats.join(', ')}"
              data-date="${formattedDate}"
              data-time="${booking.time}">
              Download Ticket
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="bookings-list">${bookingsHTML}</div>`;
  }

  // The original downloadTicket function is now removed, as its logic is in ticket-utils.js

  function setupRegularEventListeners() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // --- Account Dropdown Actions ---
    // Change User Name
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const changeNameBtn = document.getElementById('changeNameBtn');
    if (changeNameBtn) {
      changeNameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!userInfo) return;
        // Replace name with input and tick
        userInfo.innerHTML = `
          <div class="user-icon">👤</div>
          <input class="name-edit-input" id="editNameInput" type="text" value="${user.name}" maxlength="32" autocomplete="off" />
          <span class="name-edit-confirm" id="confirmNameEdit" title="Confirm">✔️</span>
        `;
        const input = document.getElementById('editNameInput');
        input.focus();
        input.select();
        document.getElementById('confirmNameEdit').onclick = async function() {
          const newName = input.value.trim();
          if (!newName || newName === user.name) {
            setLoggedInUI();
            return;
          }
          try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/update-name', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ name: newName })
            });
            const data = await res.json();
            if (res.ok) {
              localStorage.setItem('user', JSON.stringify(data.user));
              setLoggedInUI();
            } else {
              alert(data.msg || 'Failed to update name');
              setLoggedInUI();
            }
          } catch (err) {
            alert('Server error');
            setLoggedInUI();
          }
        };
        input.addEventListener('keydown', function(ev) {
          if (ev.key === 'Enter') document.getElementById('confirmNameEdit').click();
          if (ev.key === 'Escape') setLoggedInUI();
        });
      });
    }
    
    // Change Password
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        showChangePasswordModal();
      });
    }
    
    // Delete Account
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteAccountPopup();
      });
    }
    
    // Dropdown toggle for Bookings
    const bookingsItem = document.getElementById('bookingsItem');
    if (bookingsItem) {
      const bookingsDropdownHeader = bookingsItem.querySelector('.dropdown-header');
      bookingsDropdownHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        bookingsItem.classList.toggle('active');
      });
    }

    // Dropdown toggle for Account
    const accountItem = document.getElementById('accountItem');
    if (accountItem) {
      const accountDropdownHeader = accountItem.querySelector('.dropdown-header');
      accountDropdownHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        accountItem.classList.toggle('active');
      });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        console.log('Logout clicked');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.setItem('isLoggedIn', 'false');
        isAdmin = false;
        adminListenersAttached = false; // Reset the flag on logout
        setLoggedOutUI();
      });
    }

    // Current Bookings button
    const currentBookingsBtn = document.getElementById('currentBookingsBtn');
    if (currentBookingsBtn) {
      currentBookingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        openBookingsModal();
      });
    }

    // Past Bookings button
    const pastBookingsBtn = document.getElementById('pastBookingsBtn');
    if (pastBookingsBtn) {
      pastBookingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        openBookingsModal();
        // Switch to past bookings tab after a short delay
        setTimeout(() => {
          switchBookingsTab('past');
        }, 200);
      });
    }
  }

  function setupAdminMenuListeners() {
    // Admin dropdown toggle
    const adminItem = document.getElementById('adminItem');
    if (adminItem) {
      const adminDropdownHeader = adminItem.querySelector('.dropdown-header');
      adminDropdownHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        adminItem.classList.toggle('active');
      });
    }

    // Add Movie button
    const addMovieBtn = document.getElementById('addMovieBtn');
    if (addMovieBtn) {
      addMovieBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        showAdminModal('movie');
      });
    }

    // Add Theater button
    const addTheaterBtn = document.getElementById('addTheaterBtn');
    if (addTheaterBtn) {
      addTheaterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        showAdminModal('theater');
      });
    }

    // Schedule Show button
    const scheduleShowBtn = document.getElementById('scheduleShowBtn');
    if (scheduleShowBtn) {
      scheduleShowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        showAdminModal('show');
      });
    }
  }

  await initializeApp();

  if (isAdmin) {
    setupAdminEventListeners();
  }
  
});

// Add this function near other admin modal logic
function openAdminEditModal(type, data) {
  const modal = document.getElementById('adminEditModal');
  const form = document.getElementById('adminEditForm');
  const fields = document.getElementById('adminEditFormFields');
  const title = document.getElementById('adminEditModalTitle');
  if (!modal || !form || !fields || !title) return;
  title.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  fields.innerHTML = '';
  if (type === 'movie') {
    fields.innerHTML = `
      <div class="admin-form-group">
        <label for="editMovieTitle">Title</label>
        <input type="text" id="editMovieTitle" value="${data.title}" required>
      </div>
      <div class="admin-form-group">
        <label for="editMovieSynopsis">Synopsis</label>
        <textarea id="editMovieSynopsis" required>${data.synopsis || ''}</textarea>
      </div>
      <div class="admin-form-group">
        <label for="editMoviePrice">Price</label>
        <input type="number" id="editMoviePrice" min="0" value="${data.price || ''}" required>
      </div>
      <div class="admin-form-group admin-file-input">
        <input type="file" id="editMoviePoster" accept="image/jpeg,image/jpg,image/png">
        <label for="editMoviePoster" class="admin-file-label">Choose JPG file or drag here</label>
      </div>
    `;
  } else if (type === 'theater') {
    fields.innerHTML = `
      <div class="admin-form-group">
        <label for="editTheaterName">Name</label>
        <input type="text" id="editTheaterName" value="${data.name}" required>
      </div>
      <div class="admin-form-group">
        <label for="editTheaterAddress">Address</label>
        <input type="text" id="editTheaterAddress" value="${data.address}" required>
      </div>
      <div class="admin-form-group">
        <label for="editTheaterPrice">Price</label>
        <input type="number" id="editTheaterPrice" min="0" value="${data.price || ''}" required>
      </div>
      <div class="admin-form-group admin-file-input">
        <input type="file" id="editTheaterPhoto" accept="image/jpeg,image/jpg,image/png">
        <label for="editTheaterPhoto" class="admin-file-label">Choose JPG file or drag here</label>
      </div>
    `;
  }
  form.onsubmit = async function(ev) {
    ev.preventDefault();
    let url, formData, fetchOptions;
    const token = localStorage.getItem('token');
    if (type === 'movie') {
      url = `/api/movies/${data._id}`;
      formData = new FormData();
      formData.append('title', document.getElementById('editMovieTitle').value);
      formData.append('synopsis', document.getElementById('editMovieSynopsis').value);
      formData.append('price', document.getElementById('editMoviePrice').value);
      const posterInput = document.getElementById('editMoviePoster');
      if (posterInput && posterInput.files && posterInput.files[0]) {
        formData.append('poster', posterInput.files[0]);
      }
      fetchOptions = {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      };
    } else if (type === 'theater') {
      url = `/api/theaters/${data._id}`;
      formData = new FormData();
      formData.append('name', document.getElementById('editTheaterName').value);
      formData.append('address', document.getElementById('editTheaterAddress').value);
      formData.append('price', document.getElementById('editTheaterPrice').value);
      const photoInput = document.getElementById('editTheaterPhoto');
      if (photoInput && photoInput.files && photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
      }
      fetchOptions = {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      };
    }
    try {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        const err = await res.json();
        alert(err.msg || 'Failed to update.');
        return;
      }
      // Success: close modal and refresh list
      modal.classList.remove('show');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      await loadMoviesAndTheaters();
    } catch (e) {
      alert('Failed to update.');
    }
  };
  document.getElementById('closeAdminEditModal').onclick = () => {
    // Animation: add scale-out (no longer needed)
    if (modalContent) {
      modalContent.classList.add('scale-out');
      modalContent.style.animation = 'none';
    }
    // Immediately hide modal and clean up
    modal.classList.remove('show');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    // Remove header dimming
    const header = document.querySelector('header');
    if (header) header.classList.remove('header-disabled');
    if (modalContent) modalContent.classList.remove('scale-out');
  };
  modal.classList.add('show');
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  // Add header dimming
  const header = document.querySelector('header');
  if (header) header.classList.add('header-disabled');
  // Animation: remove scale-out, add scaleIn
  const modalContent = modal.querySelector('.admin-modal-content');
  if (modalContent) {
    modalContent.classList.remove('scale-out');
    modalContent.style.animation = 'scaleIn 0.25s cubic-bezier(.4,0,.2,1)';
  }
}

// After openModal(content), add this event delegation ONCE (outside setTimeout):
if (!window._removeMovieBtnListenerAdded) {
  modalDetails.addEventListener('click', async function(e) {
    if (e.target && e.target.classList.contains('remove-movie-btn')) {
      const theaterId = e.target.getAttribute('data-theater-id');
      const screenName = e.target.getAttribute('data-screen-name');
      if (!theaterId || !screenName) return;
      if (!confirm('Remove the assigned movie from this screen?')) return;
      let success = false;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/theaters/${theaterId}/screens/${encodeURIComponent(screenName)}/remove-movie`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          let data = {};
          try { data = await res.json(); } catch {}
          alert(data.msg || 'Failed to remove movie.');
          return;
        }
        success = true;
        alert('Movie removed from screen.');
      } catch (e) {
        if (!success) {
          alert('Failed to remove movie.');
          console.error(e);
        }
      }
      // UI updates should not trigger the error alert
      if (success) {
        try {
          await loadMoviesAndTheaters();
          // Find the updated theater object
          const updatedTheater = theaters.find(t => t._id === theaterId);
          if (updatedTheater) {
            openModalForTheater(updatedTheater);
          } else {
            closeModalFunc();
            renderTheaters();
          }
        } catch (e) {
          // Optionally log UI update errors, but don't show the error alert
          console.error('UI update error after removing movie:', e);
        }
      }
    }
  });
  window._removeMovieBtnListenerAdded = true;
}

// Add this after openAdminEditModal definition or in DOMContentLoaded
const adminEditModal = document.getElementById('adminEditModal');
if (adminEditModal) {
  adminEditModal.addEventListener('click', function(e) {
    if (e.target === adminEditModal) {
      const modalContent = adminEditModal.querySelector('.admin-modal-content');
      if (modalContent) {
        modalContent.classList.add('scale-out');
        modalContent.style.animation = 'none';
      }
      adminEditModal.classList.remove('show');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      // Remove header dimming
      const header = document.querySelector('header');
      if (header) header.classList.remove('header-disabled');
      if (modalContent) modalContent.classList.remove('scale-out');
    }
  });
}

// Add this after DOMContentLoaded or modal logic
const adminMovieModal = document.getElementById('adminMovieModal');
const adminMovieForm = document.getElementById('adminMovieForm');
const openAdminMovieModalBtn = document.getElementById('openAdminMovieModalBtn');
const closeMovieModalBtn = document.getElementById('closeMovieModal');
let adminMovieModalScrollY;

function lockBodyScroll() {
  adminMovieModalScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${adminMovieModalScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  if (typeof adminMovieModalScrollY !== 'undefined') {
    window.scrollTo(0, adminMovieModalScrollY);
  }
}

if (adminMovieModal) {
  // Open modal: lock scroll
  adminMovieModal.addEventListener('show', lockBodyScroll);
  // Close modal: unlock scroll
  adminMovieModal.addEventListener('hide', unlockBodyScroll);
  // Also handle click outside modal-content
  adminMovieModal.addEventListener('click', function(e) {
    if (e.target === adminMovieModal) {
      adminMovieModal.classList.remove('show');
      unlockBodyScroll();
      // Remove header dimming
      const header = document.querySelector('header');
      if (header) header.classList.remove('header-disabled');
    }
  });
}
if (closeMovieModalBtn && adminMovieModal) {
  closeMovieModalBtn.addEventListener('click', function() {
    adminMovieModal.classList.remove('show');
    unlockBodyScroll();
    // Remove header dimming
    const header = document.querySelector('header');
    if (header) header.classList.remove('header-disabled');
  });
}
// To show the modal and lock scroll:
function showAdminMovieModal() {
  if (adminMovieModal) {
    adminMovieModal.classList.add('show');
    lockBodyScroll();
    // Optionally, dim header
    const header = document.querySelector('header');
    if (header) header.classList.add('header-disabled');
  }
}

const adminTheaterModal = document.getElementById('adminTheaterModal');
if (adminTheaterModal) {
  adminTheaterModal.addEventListener('click', function(e) {
    if (e.target === adminTheaterModal) {
      adminTheaterModal.classList.remove('show');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      // Remove header dimming
      const header = document.querySelector('header');
      if (header) header.classList.remove('header-disabled');
    }
  });
}

// Helper function to re-open the modal for a theater
function openModalForTheater(theater) {
  let content = `<h3>${theater.name}</h3>
  <div class="modal-flex">
    <img src="${theater.photo_url}" class="theater-photo">
    <div class="modal-details-right">
    <div class="address">${theater.address}</div>
    <div class="playing-info">
      <strong>Now Showing:</strong>`;
  theater.screens.forEach(screen => {
    let movieTitle = (screen.now_playing || '').trim();
    const screenName = (screen.screen_name && screen.screen_name !== 'undefined') ? screen.screen_name : '';
    const movieData = movies.find(m => m.title === movieTitle);
    const movieOnHold = movieData ? movieData.onHold : false;
    const posterUrl = movieData ? movieData.poster_url : "posters/fallback.jpg";
    const theaterOnHold = theater.onHold;
    const onHold = theaterOnHold || movieOnHold;
    // Always render the booking button with the same style
    content += `\n            <div class="screen-info">\n              ${screenName}: <button type="button" class="book-movie-btn"\n              data-movie="${movieTitle}"\n              data-theater="${theater.name}"\n              data-screen="${screenName}"\n              data-source="theaters"\n              data-poster="${posterUrl}"\n              ${(movieTitle && !onHold) ? '' : 'disabled'}\n              ${onHold ? 'title=\"This show is temporarily on hold\"' : ''}>\n              ${movieTitle ? movieTitle : 'No Movie Assigned'} ${onHold ? '(On Hold)' : ''}\n            </button>\n            ${(isAdmin && movieTitle) ? `<button type=\"button\" class=\"remove-movie-btn\" data-theater-id=\"${theater._id}\" data-screen-name=\"${screenName}\">Remove Movie</button>` : ''}\n            </div>`;
  });
  content += `</div></div></div>`;
  if (isAdmin) {
    content += `\n      <div class=\"admin-form-group\" id=\"theaterAdminActionsModal\">\n        <button type=\"button\" id=\"addScreenBtnModal\" class=\"admin-submit-btn\" style=\"margin-bottom: 8px;\">Add Screen</button>\n        <button type=\"button\" id=\"assignMovieBtnModal\" class=\"admin-submit-btn\" style=\"margin-bottom: 8px;\">Assign Movie</button>\n        <div id=\"theaterAdminDropdownModal\" style=\"display:none; margin-top: 8px;\"></div>\n      </div>\n    `;
  }
  openModal(content);
  setTimeout(() => {
    if (isAdmin) {
      const addScreenBtn = document.getElementById('addScreenBtnModal');
      const assignMovieBtn = document.getElementById('assignMovieBtnModal');
      const adminDropdown = document.getElementById('theaterAdminDropdownModal');
      // (Re-attach listeners as needed, if you have logic for these buttons)
    }
  }, 20);
}

// When opening the admin show modal, restrict to today and next available show time
function setupAdminShowForm() {
  const showDateInput = document.querySelector('#showDates input[type="date"]');
  const showTimeInput = document.querySelector('#showTimes input[type="time"]');
  const addTimeBtn = document.getElementById('addTimeBtn');
  const addDateBtn = document.getElementById('addDateBtn');

  // Set date to today and disable
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  if (showDateInput) {
    showDateInput.value = todayStr;
    showDateInput.disabled = true;
  }
  if (addDateBtn) addDateBtn.style.display = 'none';

  // Find next available show time
  const showTimes = ["11:00", "14:30", "18:30", "21:30"];
  const now = new Date();
  let nextShow = null;
  for (let t of showTimes) {
    const [h, m] = t.split(":");
    const showDate = new Date(today);
    showDate.setHours(+h, +m, 0, 0);
    if (showDate > now) {
      nextShow = t;
      break;
    }
  }
  if (showTimeInput) {
    showTimeInput.value = nextShow || showTimes[showTimes.length - 1];
    showTimeInput.disabled = true;
  }
  if (addTimeBtn) addTimeBtn.style.display = 'none';
}

// Call setupAdminShowForm after the admin show modal is opened
const adminShowModal = document.getElementById('adminShowModal');
if (adminShowModal) {
  adminShowModal.addEventListener('show', setupAdminShowForm);
}
