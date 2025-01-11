
class DayEntry {
    constructor(day_entry_sidebar_div, calendar_data) {
        this.day_entry_sidebar_div = day_entry_sidebar_div;
        this.date_display = this.day_entry_sidebar_div.querySelector("#text-entry-date")
        this.date_form = this.day_entry_sidebar_div.querySelector("#day-form")
        this.text_entry = this.day_entry_sidebar_div.querySelector("#day-text-entry")
        this.checkboxes = []

        this.redraw;
        
        this.calendar_data = calendar_data;
        this.current_year = -1
        this.current_month = -1
        this.current_day = -1
        
        this.click_capture = this.day_entry_sidebar_div.querySelector("#day-click-capture")
        this.click_capture.addEventListener("click", (e) => {
            e.stopPropagation();
            this.close_sidebar()
        })
        this.date_form.addEventListener("submit", (e) => {
            // Stop the submit from refreshing the page
            e.preventDefault(); 

            // Do something with the data in the form
            this.handle_submit();
        });
    }

    set_redraw = (f) => {
        this.redraw = f
    }


    render_date = (year, month, day) => {
        return String(year) + "-" + String(month) + "-" + String(day)
    }

    open_sidebar = (year, month, day) => {
        this.current_year = year
        this.current_month = month
        this.current_day = day
        this.date_display.innerText = this.render_date(year, month, day)

        this.text_entry.value = this.calendar_data.get_day_text(year, month, day)
        // populate checkboxes
        this.day_entry_sidebar_div.style.display = "block";
        this.click_capture.style.display = "block";
    }
    close_sidebar = () => {
        this.current_year = -1;
        this.current_month = -1;
        this.current_day = -1;
        this.day_entry_sidebar_div.style.display = "none";
    }

    handle_submit = () => {
        // Get information from the form 
        // Text Entry
        const text_entry_text = this.text_entry.value
        console.log(this.current_year, this.current_month, this.current_day)
        this.calendar_data.set_day_text(this.current_year, this.current_month, this.current_day, text_entry_text)
        this.redraw()
        this.close_sidebar()
    }
}


export { DayEntry }
