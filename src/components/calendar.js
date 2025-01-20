import { CalendarData, month_name_mapping} from "./calendar_data.js"

const canvas_dim = 2000
const screen_offset_clamp_buffer = 100;
const day_size = 350; 
const default_line_width = 4;
const month_padding = 60;
function pu (unit) {
    return (unit * day_size/100)
};
const default_font = "Tahoma"

function mouse_to_scaled_translated_canvas( mouse_x, 
                                            mouse_y, 
                                            translation_x,
                                            translation_y,
                                            scale){

    // translate the mouse to the 
    const translated_mouse_x = mouse_x - translation_x
    const translated_mouse_y = mouse_y - translation_y
    // scale the translated mouse
    const scaled_translated_mouse_x = translated_mouse_x/scale
    const scaled_translated_mouse_y = translated_mouse_y/scale

    return [scaled_translated_mouse_x, scaled_translated_mouse_y]
}

function starting_weekday(month, year) {
    const day = 1;
	// The first day of each month in 1899
	// January = 0
	// Days are encoded as seen in the array above
	var monthDay = [ 1, 4, 4, 0, 2, 5, 0, 3, 6, 1, 4, 6];
	
	// The calculation, from https://youtu.be/qkkfRHaHFjQ

	// Number of years sice 1900
	var years = year-1900;
	// 365%7 = 1, so each year any given date will shift a day of the week.
	// Every 4 years a leap day is added to a year, so a date will shift 2 days instead
	// then add the day's date number. This is always at least 1, that's why we count
	// the number of years since 1900 and not 1899.
	// To get the weekday's index divide that number by 7 and take whatever is left. 
	var day_of_week = (( monthDay[month-1] + years + (Math.floor(years/4) + day) - 2))%7;

	// Returns the weekday (Monday is 0)
	return day_of_week;
}

class Calendar {
    constructor(cal_div, day_entry, calendar_data) {
        this.day_entry = day_entry
        this.calendar_data = calendar_data
        // Display canvas (whole screen) setup
        this.display_canvas = cal_div;
        this.display_canvas_context = this.display_canvas.getContext("2d");
        this.display_canvas.width = window.innerWidth;
        this.display_canvas.height =  window.innerHeight;

        // The staging canvas is used to hold the full, high resolution version of the calendar rendering
        this.staging_canvas = document.createElement("canvas");
        this.staging_context = this.staging_canvas.getContext("2d");

        // 7 days width per month, 4 months wide plus month padding
        this.staging_canvas.width = (day_size * 7) * 4 + (month_padding * 3) + 50 
        // 6 days height per month, 3 months high plus month padding
        this.staging_canvas.height = (day_size * 6) * 3 + (month_padding * 2) + 50 

        // The scaling canvas is used to hold in intermediate scaled version of the canvas when scaling the image down to improve 
        // visual appearance to the user
        this.scaling_canvas = document.createElement("canvas");
        this.scaling_context = this.scaling_canvas.getContext("2d");

        // Same size as the staging canvas
        this.scaling_canvas.width = (day_size * 7) * 4 + (month_padding * 3) + 50 
        this.scaling_canvas.height = (day_size * 6) * 3 + (month_padding * 2) + 50 

        // viewport variables
        this.viewport_x, this.viewport_y, this.viewport_scale
        // Pull previous values from localStorage to persist user view
        this.set_viewport()

        // list of click functions
        this.click_functions = []

        // checkboxes
        this.mouse_x = 0;
        this.mouse_y = 0;

        // scaling cache 
        this.last_scaling_factor = -1

        this.draw()
    }

    set_viewport = () => {
        // Pull previous values from localStorage to persist user view
        this.viewport_x = 0
        if ("view_x" in localStorage){
            this.viewport_x = Number(localStorage["view_x"])
            if (isNaN(this.viewport_x)) this.viewport_x = 0;
        }

        this.viewport_y = 0
        if ("view_y" in localStorage){
            this.viewport_y = Number(localStorage["view_y"])
            if (isNaN(this.viewport_y)) this.viewport_y = 0;
        }
        this.viewport_scale = 0.5
        if ("view_scale" in localStorage){
            this.viewport_scale = Number(localStorage["view_scale"])
        }
    }

    render_page = () => {
        // debounce
        if (this.scheduled_animation_frame){
            return;
        }
        this.scheduled_animation_frame = true;
        requestAnimationFrame(() => {
            this.render_to_display_context()
            this.scheduled_animation_frame = false;
        });
    }

    render_to_display_context = () => {
        // Clear the existing display
        this.display_canvas_context.fillStyle = this.calendar_data.visuals["background_color"]
        this.display_canvas_context.fillRect(0,0,this.display_canvas.width, this.display_canvas.height);
        const final_dim_x = this.staging_canvas.width * this.viewport_scale
        const final_dim_y = this.staging_canvas.height * this.viewport_scale

        const intermediary_scale_step = 0.6
        if (this.viewport_scale > this.intermediary_scale_step){
            this.display_canvas_context.drawImage(this.staging_canvas, 
                0, 0, intermediary_dim_x, intermediary_dim_y,
                Math.floor(this.viewport_x),
                Math.floor(this.viewport_y), 
                final_dim_x, 
                final_dim_y);
            return
        }
        var intermediary_scale = intermediary_scale_step
        var intermediary_dim_x = this.staging_canvas.width * intermediary_scale
        var intermediary_dim_y = this.staging_canvas.height * intermediary_scale
        
        this.scaling_context.fillStyle = this.calendar_data.visuals["background_color"]
        this.scaling_context.fillRect(0,0,this.scaling_canvas.width, this.scaling_canvas.height);
        this.scaling_context.drawImage(this.staging_canvas, 
            0, 0, this.staging_canvas.width, this.staging_canvas.height, 
            0, 0, 
            intermediary_dim_x, 
            intermediary_dim_y);  

        var complete = false;
        while(!complete){
            const last_step_x = intermediary_dim_x
            const last_step_y = intermediary_dim_y

            intermediary_dim_x*=intermediary_scale_step;
            intermediary_dim_y*=intermediary_scale_step;

            if (intermediary_dim_x < final_dim_x){
                intermediary_dim_x = final_dim_x;
                intermediary_dim_y = final_dim_y;
                complete = true;
            }

            this.scaling_context.drawImage(this.scaling_canvas, 
                0, 0, last_step_x, last_step_y, 
                0, 0, 
                intermediary_dim_x, 
                intermediary_dim_y);  
        } 
        const final_scale = this.viewport_scale
        this.last_scaling_factor = final_scale
        
        // Take the image from the staging canvas and draw it on the display canvas, moving and scaling appropriately.
        this.display_canvas_context.drawImage(this.scaling_canvas, 
                                              0, 0, intermediary_dim_x, intermediary_dim_y,
                                              Math.floor(this.viewport_x),
                                              Math.floor(this.viewport_y), 
                                              final_dim_x, 
                                              final_dim_y);
    }

    set_interact_position = (e) => {
        // Track where the current mouse position is
        this.mouse_x = e.clientX
        this.mouse_y = e.clientY
    }
    
    update_scale = (e) => {
        // Translate the current mouse position to a reference position in the calendar frame
        const [original_x, original_y] = mouse_to_scaled_translated_canvas(this.mouse_x, this.mouse_y, this.viewport_x, this.viewport_y, this.viewport_scale);
        
        // Update scale from y scroll
        this.viewport_scale -= (e.deltaY / 2000);
        // Clamp scroll value
        if (this.viewport_scale <= 0.05){
            this.viewport_scale = 0.05
        } else if (this.viewport_scale >= 3){
            this.viewport_scale = 3
        }

        // Translate the reference position in the calendar frame back into the mouse frame to see where it now exists after the scale
        const new_x = ((original_x * this.viewport_scale) + this.viewport_x);
        const new_y = ((original_y * this.viewport_scale) + this.viewport_y);
        // Set localStorage
        localStorage["view_scale"] = this.viewport_scale
        
        // Update the viewport offet by the difference in reference position by scaling so that the reference position stays constant. 
        this.update_offset(this.mouse_x - new_x, this.mouse_y - new_y);
        this.render_page();
    }

    update_offset = (delta_x, delta_y) => {
        // Adjust the viewport position
        this.viewport_x += delta_x;
        this.viewport_y += delta_y;
        // clamp the viewport position so that some part of the calendar is always in view
        this.clamp_offset()
        // Save new values to localStorage
        localStorage["view_x"] = this.viewport_x;
        localStorage["view_y"] = this.viewport_y;

    }

    clamp_offset = () => {
        // clamp the viewport position so that some part of the calendar is always in view
        const min_x = screen_offset_clamp_buffer - (this.staging_canvas.width * this.viewport_scale)
        const max_x = this.display_canvas.width - screen_offset_clamp_buffer
        const min_y = screen_offset_clamp_buffer - (this.staging_canvas.height * this.viewport_scale)
        const max_y = this.display_canvas.height - screen_offset_clamp_buffer
        if (this.viewport_x < min_x) { this.viewport_x = min_x }
        else if (this.viewport_x > max_x) { this.viewport_x = max_x }
        if (this.viewport_y < min_y) { this.viewport_y = min_y }
        else if (this.viewport_y > max_y) { this.viewport_y = max_y }
    }

    resize = (e) => {
        // update the canvas size and clamp the viewport position using the new dimensions.
        this.display_canvas.width = window.innerWidth;
        this.display_canvas.height =  window.innerHeight;
        this.update_offset(0,0);
        this.render_page()
    }

    onclick = (e) => {
        // translate the mouse position to the position on the calendar
        const [x, y] = mouse_to_scaled_translated_canvas(e.clientX,
                                                      e.clientY,
                                                     this.viewport_x, 
                                                     this.viewport_y, 
                                                     this.viewport_scale)
        // Call all of the registered click functions with x and y positions of the click.
        for (var id of Object.keys(this.click_functions)){
            this.click_functions[id](x, y);
        }
    }

    // register an onclick function. function should have the signature f(x, y).
    register_click_function = (f, id) => {

        this.click_functions[id] = f
        return id
    }
    // delete an onclick function.
    remove_click_function = (id) => {
        delete this.click_functions[id]
    }

    // function to check if an x,y pair in within a rectangular region
    check_clicked(x, y, x_min, x_max, y_min, y_max, f){
        if ((x > x_min) && (x < x_max) && (y > y_min) && (y < y_max)){
            f()
        }
    }

    // draw a single calendar day. 
    draw_day = (x, y, day_num, info, color, in_the_past = "") => {
        
        const ctx = this.staging_context

        ctx.strokeStyle = color;
        ctx.lineWidth = default_line_width;
        ctx.beginPath();
        ctx.rect(x, y , day_size, day_size)
        ctx.stroke();
        if (in_the_past != ""){
            ctx.fillStyle = in_the_past;
            ctx.fillRect(x, y , day_size, day_size)
        }
        
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.font = String(pu(16)) + "px " + default_font;
        ctx.beginPath()
        ctx.fillText(String(day_num), x + pu(5), y + pu(5))
        
        if (info["text"]){
            this.draw_day_text(x, y, info["text"])
        }

        // draw checkboxes
        this.draw_day_checkboxes(x, y, info["checkboxes"])
        
    }

    draw_day_text = (x, y, text) => {
        const ctx = this.staging_context
        const text_lines = text.split(/\r?\n|\r|\n/g);
        var current_line = y + pu(95) 
        ctx.textBaseline = 'bottom';
        for (var line of text_lines.reverse()){

            var line_height = pu(10);
            if (line.includes("###")) {
                line_height = pu(10);
                line = line.substring(3)
            }
            else if (line.includes("##")) {
                line_height = pu(14);
                line = line.substring(2)
            }
            else if (line.includes("#")) {
                line_height = pu(16);
                line = line.substring(1)
            } 
            if (line.charAt(0) == " ") { line = line.substring(1);}
            ctx.font = String(line_height) + "px " + default_font;
                
            ctx.fillText(line, 
                x + pu(5),
                current_line)
            current_line -= line_height;
        }
    }

    draw_day_checkboxes = (x, y, day_checkboxes) => {
        const ctx = this.staging_context
        const checkbox_y_seperation = pu(15)
        var checkbox_y = y + pu(5);
        const checkbox_x = x + day_size - pu(15);
        const checkbox_width = pu(10);
        for (const checkbox_type in this.calendar_data.checkboxes){
            if (day_checkboxes.includes(checkbox_type)){
                // console.log(checkbox_type, day_checkboxes, this.calendar_data.checkboxes[checkbox_type])
                ctx.fillStyle = this.calendar_data.checkboxes[checkbox_type];
                ctx.fillRect(checkbox_x, checkbox_y, checkbox_width, checkbox_width);
            }
            ctx.beginPath()
            ctx.lineWidth = default_line_width/2;
            ctx.strokeRect(checkbox_x, checkbox_y, checkbox_width, checkbox_width)
            checkbox_y += checkbox_y_seperation
        }
    }

    // draw a calendar month
    // info should be a CalendarMonthData object
    draw_month = (x, y, year, info, line_color, month_text_color = "", passed_day_color = "") => {
        const month_num = info.month
        if (month_text_color == ""){
            month_text_color = line_color
        }

        // Indexed to 0 as monday
        const starting_day_of_week = starting_weekday(month_num, year);

        var current_day_of_week = starting_day_of_week;
        var current_row = 0;
        for (var day_num = 1; day_num < info.days_in_month+1; day_num++){
            const x_pos = x + (current_day_of_week * day_size);
            const y_pos = y + (current_row * day_size);
            const this_day = day_num
            const day_in_consideration = new Date(year, month_num-1, this_day);
            const yesterday = new Date().setDate(new Date().getDate() - 1);
            var button_id = String(month_num) + "-" + String(this_day)
            if (yesterday > day_in_consideration.getTime() && passed_day_color != ""){
                this.draw_day(x_pos, y_pos, day_num, info.days[String(day_num)], line_color, passed_day_color)
            } else {
                this.draw_day(x_pos, y_pos, day_num, info.days[String(day_num)], line_color)
            }

            // Button ID is used so that when draw_month is called by redraw(), the existing bindings are removed
            this.register_click_function((x_val, y_val) => {
                this.check_clicked(x_val, y_val, x_pos, x_pos+day_size, y_pos, y_pos+day_size, () => {
                        this.edit_menu(year, month_num, this_day);
                    })
                }, button_id)
            
            current_day_of_week += 1;
            if ((current_day_of_week % 7) == 0){
                current_day_of_week = 0;
                current_row += 1;
            }
        }

        this.staging_context.strokeStyle = line_color;
        this.staging_context.beginPath()
        this.staging_context.lineWidth = default_line_width*1.2;
        this.staging_context.strokeRect(x, y, day_size * 7, day_size * 6)
        this.staging_context.stroke()

        if (current_row != 5) {
            current_day_of_week = 0;
            current_row = 5;
        }

        this.staging_context.fillStyle = month_text_color;
        this.staging_context.textBaseline = 'middle';
        this.staging_context.textAlign = 'left';
        this.staging_context.font = String(pu(40)) + "px " + default_font;
        this.staging_context.fillText(month_name_mapping[month_num], x + (current_day_of_week * day_size) + pu(50), y + (current_row * day_size) + pu(50), day_size * 7, day_size * 6)
    }
    // draw a calendar month
    // info should be a CalendarYearData object. Should probably improve naming of "info"
    draw_year = (x, y, info, line_color, month_text_color = "", passed_day_color="") => {
        const year = info.year;
        const month_width = 7 * day_size + month_padding
        const month_height = 6 * day_size + month_padding
        
        var month_index = 1;
        for (var current_row = 0; current_row < 3; current_row++){
            for (var current_col = 0; current_col < 4; current_col++){
                const month_info = info.months[String(month_index)]

                this.draw_month(x + (current_col * month_width), 
                                y + (current_row * month_height), 
                                year, month_info, 
                                line_color, month_text_color, passed_day_color);
                month_index++;
            }
        }
    }

    draw = () =>{
        // debounce
        if (this.scheduled_redraw){
            return;
        }
        this.scheduled_redraw = true;
        console.log("redrawing");
        requestAnimationFrame(() => {
            this.staging_context.fillStyle = this.calendar_data.visuals["background_color"];
            this.staging_context.fillRect(0,0,this.staging_canvas.width, this.staging_canvas.height);
            this.draw_year(5, 5, this.calendar_data.year_data["2025"],
                this.calendar_data.visuals["line_color"],
                this.calendar_data.visuals["month_text_color"], 
                this.calendar_data.visuals["finished_day_color"]);
            this.scheduled_redraw = false;
            this.render_page()
        });
    }

    edit_menu = (year, month, day) => {
        this.day_entry.open_sidebar(year, month, day);
    }
}

export { Calendar }
