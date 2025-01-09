import { Calendar } from "./components/calendar.js"
import { CalendarData } from "./components/calendar_data.js"

function main() {
    this.calendar_data = new CalendarData()
    this.calendar_data.initialize_new(2025)
    this.calendar_data.add_new_checkbox("run", "#FF0000")
    this.calendar_data.add_new_checkbox("lift", "#F0F000")
    this.calendar_data.year_data["2025"].months["2"].days["1"]["checkboxes"] = ["run"]
    this.calendar_data.year_data["2025"].months["2"].days["1"]["text"] = "Text\n123456"
    this.calendar_data.year_data["2025"].months["1"].days["11"]["checkboxes"] = ["lift"]
    this.calendar_data.year_data["2025"].months["1"].days["7"]["checkboxes"] = ["lift"]
    this.calendar_data.year_data["2025"].months["8"].days["22"]["checkboxes"] = ["run"]
    // Pull the calendar canvas and create the calendar object
    const calendar_canvas_div = document.getElementById("calendar-canvas");
    var calendar = new Calendar(calendar_canvas_div, this.calendar_data, "#e8dec9");


    // Draw a day
    // calendar.draw_day(200, 500, 1, day_info, "black", "#14ff2c21");
    // calendar.draw_day(500, 500, 2, day_info_2, "black");
    calendar.draw_year(5, 5, this.calendar_data.year_data["2025"],
                       "black", "green", "#00ff0030");

    // Render the display
    calendar.render_page();
    register_event_handlers(calendar)
}

function register_event_handlers(calendar) {
  // Register event handlers
  var drag_in_progress = false;
  var start_x, start_y;

  // Begin dragging if the user touches or clicks
  window.ontouchstart = window.onmousedown = (e) => {
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
