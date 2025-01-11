import { Calendar } from "./components/calendar.js"
import { CalendarData } from "./components/calendar_data.js"
import { DayEntry } from "./components/day_entry.js"

function main() {

    var loaded_calendar_data = new CalendarData()
    if (!loaded_calendar_data.load_from_browser()){
      console.log("Initializing new year")
      loaded_calendar_data.initialize_new(2025, {"Run": "#51a145", "Lift" : "#f5b32e"})
    }
    // Pull the calendar canvas and create the calendar object
    const calendar_canvas_div = document.getElementById("calendar-canvas");
    const text_entry_div = document.getElementById("text-entry-sidebar");
    var day_entry = new DayEntry(text_entry_div, loaded_calendar_data)
    var calendar = new Calendar(calendar_canvas_div, day_entry, loaded_calendar_data, "#e8dec9");

    day_entry.set_redraw(calendar.draw)
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

  // Scale
  window.onwheel = (e) => {
    calendar.update_scale(e);
  }
}
window.addEventListener('load', main)
