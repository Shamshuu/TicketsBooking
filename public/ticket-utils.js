/**
 * Generates an image from ticket details and downloads it.
 * @param {object} ticketDetails - An object containing all necessary ticket information.
 * @param {string} ticketDetails.movie - The movie title.
 * @param {string} ticketDetails.posterUrl - The URL for the movie poster.
 * @param {string} ticketDetails.theater - The theater name.
 * @param {string} ticketDetails.screen - The screen name.
 * @param {string} ticketDetails.seats - A comma-separated string of seat numbers.
 * @param {string} ticketDetails.date - The formatted date of the show.
 * @param {string} ticketDetails.time - The time of the show.
 * @param {number} ticketDetails.totalPrice - The total price of the booking.
 */
function downloadTicketAsImage(ticketDetails) {
  const { movie, posterUrl, theater, screen, seats, date, time, totalPrice } = ticketDetails;

  // 1. Create a temporary element to hold the ticket content
  const ticketContent = document.createElement('div');
  // Add styling to match the original ticket design
  ticketContent.style.background = '#fff';
  ticketContent.style.borderRadius = '16px';
  ticketContent.style.padding = '32px 40px';
  ticketContent.style.minWidth = '400px';
  ticketContent.style.maxWidth = '95vw';
  ticketContent.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  ticketContent.style.position = 'relative';
  ticketContent.style.display = 'flex';
  ticketContent.style.flexDirection = 'column';
  ticketContent.style.alignItems = 'center';
  
  // 2. Populate it with the ticket HTML
  ticketContent.innerHTML = `
    <div style="display:flex; gap:30px; margin-bottom:30px; position:relative;">
      <div style="flex-shrink:0;">
        <img src="${posterUrl}" alt="${movie} poster" style="width:160px; border-radius:4px; box-shadow:0 4px 12px #0003;" crossorigin="anonymous">
      </div>
      <div style="position:relative; flex:1; min-width:0; padding-left:30px;">
        <div style="position:absolute; left:0; top:0; bottom:0; width:1px; border-left:2px dotted #ccc; border-radius:1px;"></div>
        <div style="padding-left:20px;">
          <h2 style="margin:0 0 16px 0; color:#0d1333; font-size:22px; font-weight:600;">${movie}</h2>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Theater:</b> ${theater}</div>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Screen:</b> ${screen}</div>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Seats:</b> ${seats}</div>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Date:</b> ${date}</div>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Show Time:</b> ${time}</div>
          <div style="font-size:16px; color:#555; margin-bottom:12px; line-height:1.5;"><b>Total Price:</b> ₹${totalPrice}</div>
        </div>
      </div>
    </div>
  `;

  // 3. Append to body invisibly to make it renderable
  ticketContent.style.position = 'absolute';
  ticketContent.style.left = '-9999px';
  document.body.appendChild(ticketContent);

  // 4. Use html2canvas to generate the image
  html2canvas(ticketContent, {
    backgroundColor: '#fff',
    scale: 2,
    useCORS: true, 
  }).then(canvas => {
    // Add a margin around the captured content
    const margin = 40;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width + (margin * 2);
    newCanvas.height = canvas.height + (margin * 2);
    const ctx = newCanvas.getContext('2d');
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    ctx.drawImage(canvas, margin, margin);

    // 5. Trigger the download
    const link = document.createElement('a');
    link.download = `${movie.replace(/\s+/g, '_')}_ticket.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();

  }).catch(error => {
    console.error('Error generating ticket:', error);
    alert('Error generating ticket. Please try again.');
  }).finally(() => {
    // 6. Clean up: remove the temporary element
    if (document.body.contains(ticketContent)) {
      document.body.removeChild(ticketContent);
    }
  });
}

// Admin Show Scheduler Utilities
async function fetchMovies() {
  const res = await fetch('/admin/movies', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }});
  return res.json();
}
async function fetchShows(movieId) {
  const res = await fetch(`/admin/shows/admin?movieId=${movieId}`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }});
  return res.json();
}
async function fetchAvailableScreens(theaterId, date, time) {
  const res = await fetch(`/admin/shows/admin/screens/available?theaterId=${theaterId}&date=${date}&time=${time}`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }});
  return res.json();
}
function openModalById(id) {
  document.getElementById(id).style.display = 'block';
}
function closeModalById(id) {
  document.getElementById(id).style.display = 'none';
}
function parseTags(input) {
  return input.split(',').map(t => t.trim()).filter(Boolean);
}
// Real-time validation for available screens
async function validateScreenAvailability(theaterId, date, time) {
  const screens = await fetchAvailableScreens(theaterId, date, time);
  const screenSelect = document.getElementById('screenSelect');
  screenSelect.innerHTML = '';
  screens.forEach(screen => {
    const opt = document.createElement('option');
    opt.value = screen.screen_name;
    opt.textContent = screen.screen_name;
    screenSelect.appendChild(opt);
  });
  if (screens.length === 0) {
    screenSelect.disabled = true;
  } else {
    screenSelect.disabled = false;
  }
} 