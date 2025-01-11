
class DayEntry {
    constructor(day_entry_sidebar_div, calendar_data) {
        this.day_entry_sidebar_div = day_entry_sidebar_div;
        this.date_display = this.day_entry_sidebar_div.querySelector("#text-entry-date")
        this.date_form = this.day_entry_sidebar_div.querySelector("#day-form")
        this.text_entry = this.day_entry_sidebar_div.querySelector("#day-text-entry")
        this.checkbox_list = this.day_entry_sidebar_div.querySelector("#checkboxes")

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
        const all_checkboxes = this.calendar_data.checkboxes
        //console.log(all_checkboxes)
        const checked_checkboxes = this.calendar_data.get_day_checkboxes(year, month, day)

        for (const checkbox in all_checkboxes){
            const name = checkbox
            const color = all_checkboxes[checkbox]
            const checked = checked_checkboxes.includes(checkbox)
            this.append_checkbox(name, color, checked)
        }

        this.day_entry_sidebar_div.style.display = "block";
        this.click_capture.style.display = "block";
    }
    close_sidebar = () => {
        this.current_year = -1;
        this.current_month = -1;
        this.current_day = -1;
        this.checkbox_list.innerHTML = "";
        this.day_entry_sidebar_div.style.display = "none";
    }

    handle_submit = () => {
        // Get information from the form 
        // Text Entry
        const text_entry_text = this.text_entry.value
        //console.log(this.current_year, this.current_month, this.current_day)

        const all_checkboxes = this.calendar_data.checkboxes
        var checkbox_list = []
        for (const checkbox in all_checkboxes){
            const checkbox_element = document.getElementById(this.cbx_name(checkbox));
            if  (checkbox_element.checked){
                checkbox_list.push(checkbox)
            }
        }
        this.calendar_data.set_day_checkboxes(this.current_year, this.current_month, this.current_day, checkbox_list)
        this.calendar_data.set_day_text(this.current_year, this.current_month, this.current_day, text_entry_text)
        this.calendar_data.save_to_browser()
        this.redraw()
        this.close_sidebar()
    }

    append_checkbox = (name, color, checked) => {
        // TODO: use color
        const container = document.createElement("div");
        container.className = "checkbox-row";

        const label = document.createElement("div");
        label.className = "checkbox-label";
        label.innerText = name

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = this.cbx_name(name);
        checkbox.checked = checked
        checkbox.style.accentColor = color;

        container.appendChild(label)
        container.appendChild(checkbox)

        this.checkbox_list.appendChild(container);
    }

    cbx_name = (name) => {
        return ("checkbox-" + name);
    }
}


export { DayEntry }
