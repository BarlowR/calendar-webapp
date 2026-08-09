import { Calendar } from "./components/calendar.js"
import { CalendarData } from "./components/calendar_data.js"
import { DayEntry } from "./components/day_entry.js"
import { Menu } from "./components/menu.js"
import {GoogleDriveAuth, GoogleDriveCalendarFileHandler} from "./components/drive_sync.js"


function main() {
  var calendar_data = new CalendarData()
  
  // Try pulling data from browser cache first
  if (!calendar_data.load_from_browser()){
    console.log("Initializing new year")
    // Start a new year if there is no data available
    calendar_data.initialize_new(new Date().getFullYear(), {"Run": "#51a145", "Lift" : "#f5b32e"})
  }

  // Create the google drive calendar data handler
  var file_handler = new GoogleDriveCalendarFileHandler(calendar_data);

  // Pull the calendar canvas and create the calendar object. This will draw the placeholder calendar data.
  const calendar_canvas_div = document.getElementById("calendar-canvas");
  const text_entry_div = document.getElementById("text-entry-sidebar");
  const menu_click_div = document.getElementById("menu-open");
  const menu_div = document.getElementById("menu");
  var day_entry = new DayEntry(text_entry_div, calendar_data, file_handler)
  var calendar = new Calendar(calendar_canvas_div, day_entry, calendar_data);
  day_entry.set_redraw(calendar.draw)

  var menu = new Menu(menu_click_div, menu_div, calendar_data, file_handler)
  menu.set_color(calendar_data.visuals["background_color"])
  menu.set_redraw(calendar.draw)

  // Make menu globally accessible for HTML onclick handlers
  window.menu = menu

  // Set the data handler redraw callback
  file_handler.set_redraw(() => {
    calendar.draw()
    menu.set_color(calendar_data.visuals["background_color"])
  })
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
  // Pointer Events unify mouse and touch (TouchEvents don't carry
  // clientX/clientY, which the old mouse-centric handlers relied on).
  // Pointers currently pressed on the calendar, by pointerId.
  const active_pointers = new Map();
  // Total distance travelled since the first pointer went down; a press that
  // releases without meaningful movement is a tap/click on a day.
  var tap_travel = 0;
  const tap_travel_max = 10;
  // Distance and midpoint of the two pinch pointers.
  var pinch = null;

  const measure_pinch = () => {
    const [p1, p2] = [...active_pointers.values()];
    return {
      dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  calendar_canvas.onpointerdown = (e) => {
    // Keep receiving move/up events even when the pointer leaves the canvas
    calendar_canvas.setPointerCapture(e.pointerId);
    active_pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (active_pointers.size == 1) {
      tap_travel = 0;
    } else if (active_pointers.size == 2) {
      pinch = measure_pinch();
    }
  }

  window.onpointermove = (e) => {
    // Track the hover position for wheel zoom
    calendar.set_interact_position(e);
    if (!active_pointers.has(e.pointerId)) {
      return;
    }
    const prev = active_pointers.get(e.pointerId);
    active_pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tap_travel += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);

    if (active_pointers.size == 1) {
      // One pointer: pan
      calendar.update_offset(e.clientX - prev.x, e.clientY - prev.y);
      calendar.render_page();
    } else if (active_pointers.size == 2 && pinch) {
      // Two pointers: pan with the midpoint, zoom with the spread
      const new_pinch = measure_pinch();
      calendar.update_offset(new_pinch.x - pinch.x, new_pinch.y - pinch.y);
      if (pinch.dist > 0) {
        calendar.zoom_at(
          new_pinch.x,
          new_pinch.y,
          calendar.viewport_scale * (new_pinch.dist / pinch.dist)
        );
      }
      pinch = new_pinch;
    }
  }

  window.onpointerup = window.onpointercancel = (e) => {
    if (!active_pointers.has(e.pointerId)) {
      return;
    }
    const was_only_pointer = active_pointers.size == 1;
    active_pointers.delete(e.pointerId);
    pinch = null;
    // A single press released without movement is a tap on a day
    if (e.type == 'pointerup' && was_only_pointer && tap_travel < tap_travel_max) {
      calendar.onclick(e);
    }
  }

  // Handle resizes
  window.onresize = (e) => {
    calendar.resize(e);
  }

  // Zoom with the scroll wheel / trackpad. Registered on the canvas only, so
  // the menu and day sidebar keep their normal scrolling.
  calendar_canvas.addEventListener('wheel', (e) => {
    // Prevent default scrolling behavior
    e.preventDefault();
    // Update scale
    calendar.update_scale(e);
  }, { passive: false }); // Required for preventing default behavior
}
window.addEventListener('load', main)
