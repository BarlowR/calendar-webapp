import { Calendar } from "./src/components/calendar.js"
import { CalendarData } from "./src/components/calendar_data.js"
import { DayEntry } from "./src/components/day_entry.js"
import {GoogleDriveAuth, GoogleDriveCalendarFileHandler} from "./src/components/drive_sync.js"


function main() {
  var calendar_data = new CalendarData()
  
  // Try pulling data from browser cache first
  if (!calendar_data.load_from_browser()){
    console.log("Initializing new year")
    // Start a new year if there is no data available
    calendar_data.initialize_new(2025, {"Run": "#51a145", "Lift" : "#f5b32e"})
  }

  // Create the google drive calendar data handler
  var file_handler = new GoogleDriveCalendarFileHandler(calendar_data);

  // Pull the calendar canvas and create the calendar object. This will draw the placeholder calendar data.
  const calendar_canvas_div = document.getElementById("calendar-canvas");
  const text_entry_div = document.getElementById("text-entry-sidebar");
  var day_entry = new DayEntry(text_entry_div, calendar_data, file_handler)
  var calendar = new Calendar(calendar_canvas_div, day_entry, calendar_data);
  day_entry.set_redraw(calendar.draw)
  
  // Set the data handler redraw callback
  file_handler.set_redraw(calendar.draw)
  // Create a authentication handler and register the file pull callback
  var auth = new GoogleDriveAuth(file_handler.auth_callback)
  
  // Request authorization from the user
  if (auth.request_auth()){
    console.log("GDrive Authorization Success");
  } else { 
    // TODO: Pop-up that says, "Not syncing with google"
  }
  register_event_handlers(calendar, calendar_canvas_div)
}

function register_event_handlers(calendar, calendar_canvas) {
  // Register event handlers
  var drag_in_progress = false;
  var start_x, start_y;

  // Begin dragging if the user touches or clicks
  calendar_canvas.ontouchstart = calendar_canvas.onmousedown = (e) => {
    drag_in_progress = true;
    start_x = e.clientX;
    start_y = e.clientY;

    // Check if the user has moved after clicking. If not, then the user has clicked on something and isn't dragging
    setTimeout(() => {
      if (start_x == e.clientX && start_y == e.clientY && !drag_in_progress){
        calendar.onclick(e);
      }
    }, 200)
  }
  
  // End dragging if the user stops clicking or touching
  window.ontouchend = window.onmouseup = (e) => {
    drag_in_progress = false;
  }

  // Track mouse movement
  window.ontouchmove = window.onmousemove = (e) => {
    calendar.set_interact_position(e);
    if (!drag_in_progress){
      return;
    }
    // Calculate the difference since the last event
    const delta_x = e.clientX - start_x;
    const delta_y = e.clientY - start_y;
    // Update the offset
    calendar.update_offset(delta_x, delta_y);
    // Set the current position
    start_x = e.clientX;
    start_y = e.clientY;
    // Queue a new render
    calendar.render_to_display_context()
  }

  // Handle resizes
  window.onresize = (e) => {
    calendar.resize(e);
  }

  window.addEventListener('wheel', (e) => {
    // Prevent default scrolling behavior
    e.preventDefault();  
    // Update scale
    calendar.update_scale(e); 
  }, { passive: false }); // Required for preventing default behavior
}
window.addEventListener('load', main)
