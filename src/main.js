import { Calendar } from "./components/calendar.js"
import { CalendarData } from "./components/calendar_data.js"
import { DayEntry } from "./components/day_entry.js"

function main() {
    var calendar_data = new CalendarData()
    calendar_data.initialize_new(2025)
    calendar_data.add_new_checkbox("run", "#FF0000")
    calendar_data.add_new_checkbox("lift", "#F0F000")
    calendar_data.year_data["2025"].months["2"].days["1"]["checkboxes"] = ["run"]
    calendar_data.year_data["2025"].months["2"].days["1"]["text"] = "Text\n123456"
    calendar_data.year_data["2025"].months["1"].days["11"]["checkboxes"] = ["lift"]
    calendar_data.year_data["2025"].months["1"].days["7"]["checkboxes"] = ["lift"]
    calendar_data.year_data["2025"].months["8"].days["22"]["checkboxes"] = ["run"]

    const json_calendar_data_string = calendar_data.save_to_jsons()
    console.log(json_calendar_data_string)

    var loaded_calendar_data = new CalendarData()
    loaded_calendar_data.initialize_from_jsons(json_calendar_data_string)
    console.log(loaded_calendar_data)

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
