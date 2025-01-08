const canvas_dim = 2000
const screen_offset_clamp_buffer = 100;
const day_size = 300; 
const default_line_width = 6;
const month_padding = 100;
function pu (unit) {
    return (unit * day_size/100)
};

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
    constructor(cal_div) {
        // Display canvas (whole screen) setup
        this.display_canvas = cal_div;
        this.display_canvas_context = this.display_canvas.getContext("2d");
        this.display_canvas.width = window.innerWidth;
        this.display_canvas.height =  window.innerHeight;

        // The staging canvas is used to hold the full, high resolution version of the calendar rendering
        this.staging_canvas = document.createElement("canvas");
        this.staging_context = this.staging_canvas.getContext("2d");

        // 7 days width per month, 4 months wide plus month padding
        this.staging_canvas.width = (day_size * 7) * 4 + (month_padding * 3)
        // 6 days height per month, 3 months high plus month padding
        this.staging_canvas.height = (day_size * 6) * 3 + (month_padding * 2)

        // The scaling canvas is used to hold in intermediate scaled version of the canvas when scaling the image down to improve 
        // visual appearance to the user
        this.scaling_canvas = document.createElement("canvas");
        this.scaling_context = this.scaling_canvas.getContext("2d");

        // Same size as the staging canvas
        this.scaling_canvas.width = (day_size * 7) * 4 + (month_padding * 3)
        this.scaling_canvas.height = (day_size * 6) * 3 + (month_padding * 2)

        // viewport variables
        this.viewport_x, this.viewport_y, this.viewport_scale
        // Pull previous values from localStorage to persist user view
        this.set_viewport()

        // list of click functions
        this.click_functions = []

        // checkboxes
        this.checkboxes = {"run" : "#FFFF00", "jog": "#000000", "lift" : "#00FF00"}
        this.mouse_x = 0;
        this.mouse_y = 0;
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
        this.display_canvas_context.fillStyle = "white"
        this.display_canvas_context.fillRect(0,0,this.display_canvas.width, this.display_canvas.height);

        // Take the image from the staging canvas and draw it on the display canvas, moving and scaling appropriately.
        this.display_canvas_context.drawImage(this.staging_canvas, 
                                              0, 0, this.staging_canvas.width, this.staging_canvas.height, 
                                              Math.floor(this.viewport_x),
                                              Math.floor(this.viewport_y), 
                                              this.staging_canvas.width * this.viewport_scale, 
                                              this.staging_canvas.height * this.viewport_scale);
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
        this.viewport_scale += (e.deltaY / 500);
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
        localStorage["view_x"] = this.viewport_x
        localStorage["view_y"] = this.viewport_y

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
        for (var i = 0; i < this.click_functions.length; i++){
            // This feels disgusting
            this.click_functions[i](x, y);
        }
    }

    // register an onclick function. function should have the signature f(x, y).
    register_click_function = (f) => {

        this.click_functions.push(f)
        return (this.click_functions.length - 1)
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
        
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.font = String(pu(16)) + "px sans-serif";
        ctx.beginPath()
        ctx.fillText(String(day_num), x + pu(5), y + pu(5))
    
        const text_lines = info["text"].split(/\r?\n|\r|\n/g);

        ctx.font = String(pu(10)) + "px sans-serif";
        
        const line_seperation = pu(10)
        var current_line = y + pu(25) 
        for (var line of text_lines){
            ctx.fillText(line, 
                x + pu(5),
                current_line)
            current_line += line_seperation;
        }

        const checkbox_y_seperation = pu(15)
        var checkbox_y = y + pu(5);
        const checkbox_x = x + day_size - pu(15);
        const checkbox_width = pu(10);
        for (const checkbox_type in this.checkboxes){
            if (info["checkboxes"].includes(checkbox_type)){
                ctx.fillStyle = this.checkboxes[checkbox_type];
                ctx.fillRect(checkbox_x, checkbox_y, checkbox_width, checkbox_width);
            }
            ctx.beginPath()
            ctx.lineWidth = default_line_width;
            ctx.strokeRect(checkbox_x, checkbox_y, checkbox_width, checkbox_width)
            checkbox_y += checkbox_y_seperation
        }
    }

    // draw a calendar month
    draw_month = (x, y, month_num, year, days, info, color) => {

        // Indexed to 0 as monday
        const starting_day_of_week = starting_weekday(month_num, year);

        var current_day_of_week = starting_day_of_week;
        var current_row = 0;

        for (var day_num = 0; day_num < days; day_num++){
            const x_pos = x + (current_day_of_week * day_size);
            const y_pos = y + (current_row * day_size);
            this.draw_day(x_pos, y_pos, day_num + 1, info[day_num], color)
            const this_day = day_num
            this.register_click_function((x_val, y_val) => {
                this.check_clicked(x_val, y_val, x_pos, x_pos+day_size, y_pos, y_pos+day_size, () => {
                        console.log(year, month_num, this_day+1);
                    })
                })
            
            current_day_of_week += 1;
            if ((current_day_of_week % 7) == 0){
                current_day_of_week = 0;
                current_row += 1;
            }
        }

        this.staging_context.beginPath()
        this.staging_context.lineWidth = default_line_width;
        this.staging_context.strokeRect(x, y, day_size * 7, day_size * 6)
        this.staging_context.stroke()
    }
}

export { Calendar }
