
class DayEntry {
    constructor(day_entry_sidebar_div, calendar_data, gdrive) {
        // Pull all the HTML elements
        this.day_entry_sidebar_div = day_entry_sidebar_div;
        this.date_display = this.day_entry_sidebar_div.querySelector("#text-entry-date")
        this.date_form = this.day_entry_sidebar_div.querySelector("#day-form")
        this.text_entry = this.day_entry_sidebar_div.querySelector("#day-text-entry")
        this.checkbox_list = this.day_entry_sidebar_div.querySelector("#checkboxes")
        this.gdrive = gdrive

        this.redraw;
        this.calendar_data = calendar_data;
        this.current_year = -1
        this.current_month = -1
        this.current_day = -1
        
        // Set event listeners 
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
        // Helper function for getting a common string from a data
        return String(year) + "-" + String(month) + "-" + String(day)
    }

    cbx_name = (name) => {
        // Helper function for creating checkbox element ids
        return ("checkbox-" + name);
    }

    open_sidebar = (year, month, day) => {
        // Set the workign date
        this.current_year = year
        this.current_month = month
        this.current_day = day
        this.date_display.innerText = this.render_date(year, month, day)

        // Set the text box value to the existing text for that day
        this.text_entry.value = this.calendar_data.get_day_text(year, month, day)

        // populate checkboxes
        const all_checkboxes = this.calendar_data.checkboxes
        //console.log(all_checkboxes)
        const checked_checkboxes = this.calendar_data.get_day_checkboxes(year, month, day)

        // Create all checkboxes
        for (const checkbox in all_checkboxes){
            const name = checkbox
            const color = all_checkboxes[checkbox]
            const checked = checked_checkboxes.includes(checkbox)
            this.append_checkbox(name, color, checked)
        }

        // Set the elements to display
        this.day_entry_sidebar_div.style.display = "block";
        this.click_capture.style.display = "block";
    }

    close_sidebar = () => {
        // Reset the current working day and text entry
        this.current_year = -1;
        this.current_month = -1;
        this.current_day = -1;
        this.checkbox_list.innerHTML = "";
        // Hide the sidebar element.
        this.day_entry_sidebar_div.style.display = "none";
    }

    handle_submit = () => {
        // Get information from the form 
        // Text Entry
        const text_entry_text = this.text_entry.value
        //console.log(this.current_year, this.current_month, this.current_day)

        // Pull a list of the checked checkboxes
        const all_checkboxes = this.calendar_data.checkboxes
        var checkbox_list = []
        for (const checkbox in all_checkboxes){
            const checkbox_element = document.getElementById(this.cbx_name(checkbox));
            if  (checkbox_element.checked){
                checkbox_list.push(checkbox)
            }
        }
        // Set the checkboxes data field from the list of checked checkboxes
        this.calendar_data.set_day_checkboxes(this.current_year, this.current_month, this.current_day, checkbox_list)
        // Set the text field data field from the currently typed text
        // TODO: automatically break text line length based on box size
        this.calendar_data.set_day_text(this.current_year, this.current_month, this.current_day, text_entry_text)
        // Save the new calendar data to localSession storage
        this.calendar_data.save_to_browser()
        // Save the new calendar data to google drive.
        this.gdrive.upload_json_string_to_file(this.calendar_data.save_to_jsons())
        // Redraw the canvas with the new data
        this.redraw()
        // Close the sidebar
        this.close_sidebar()
    }

    append_checkbox = (name, color, checked) => {
        // Add a checkbox to the list of checkboxes on the sidebar
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
}


export { DayEntry }
