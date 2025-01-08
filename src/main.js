import { Calendar } from "./components/calendar.js"

function main() {
    // Pull the calendar canvas and create the calendar object
    const calendar_canvas_div = document.getElementById("calendar-canvas");
    var calendar = new Calendar(calendar_canvas_div);

    // Temporary data for testing. 
    const day_info = {"text" : "ANsddjasd \n skjdasd \n asjd", 
                      "checkboxes" : ["run", "lift"]
    }
    const day_info_2 = {"text" : "Test 123", 
      "checkboxes" : ["lift", "jog"]
    }
    // More temporary data
    const month_info = [];
    for (var i = 0; i < 31; i++){
      if (i%2 == 0) { month_info.push(day_info) }
      else { month_info.push(day_info_2); }
    }
    console.log(month_info)

    // Draw a day
    calendar.draw_day(200, 500, 1, day_info, "black", "#14ff2c21");
    calendar.draw_day(500, 500, 2, day_info_2, "black");
    // calendar.draw_month(0, 0, 1, 2025, 31, month_info, "black");
    // calendar.draw_month(300 * 7, 0, 2, 2025, 28, month_info, "black");
    // calendar.draw_month(300 * 14, 0, 3, 2025, 31, month_info, "black");
    // calendar.draw_month(0, 300*6, 4, 2025, 30, month_info, "black");
    // calendar.draw_month(300 * 7, 300*6, 5, 2025, 31, month_info, "black");
    // calendar.draw_month(300 * 14, 300*6, 6, 2025, 30, month_info, "black");

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
