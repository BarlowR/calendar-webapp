class Menu {
    constructor (menu_click, menu, calendar_data, gdrive_handler) {
        this.menu_click = menu_click
        this.menu = menu
        this.calendar_data = calendar_data
        this.gdrive_handler = gdrive_handler
        this.color
        this.redraw_func

        // Get references to menu elements
        this.menu_display = this.menu.querySelector('#menu-display')
        this.menu_click_capture = this.menu.querySelector('#menu-click-capture')
        this.existing_checkboxes_div = this.menu.querySelector('#existing-checkboxes')
        this.new_checkbox_name = this.menu.querySelector('#new-checkbox-name')
        this.new_checkbox_color = this.menu.querySelector('#new-checkbox-color')
        this.add_checkbox_btn = this.menu.querySelector('#add-checkbox-btn')

        this.background_color_input = this.menu.querySelector('#background-color')
        this.line_color_input = this.menu.querySelector('#line-color')
        this.month_text_color_input = this.menu.querySelector('#month-text-color')
        this.finished_day_color_input = this.menu.querySelector('#finished-day-color')

        this.colors_title = this.menu.querySelector('#colors-title')
        this.cycle_colors_btn = this.menu.querySelector('#cycle-colors-btn')
        this.close_menu_btn = this.menu.querySelector('#close-menu-btn')

        // Define predefined color sets
        this.color_themes = [
            {
                name: "Custom",
                background_color: null, // Will be populated from current settings
                line_color: null,
                month_text_color: null,
                finished_day_color: null
            },
            {
                name: "Classic Beige",
                background_color: "#e8dec9",
                line_color: "#000000",
                month_text_color: "#166709",
                finished_day_color: "#674909"
            },
            {
                name: "Ocean Blue",
                background_color: "#e8f4f8",
                line_color: "#1a365d",
                month_text_color: "#2c5aa0",
                finished_day_color: "#2d5aa0"
            },
            {
                name: "Forest Green",
                background_color: "#f0f7ed",
                line_color: "#2d3748",
                month_text_color: "#2f855a",
                finished_day_color: "#38a169"
            },
            {
                name: "Sunset Orange",
                background_color: "#fff7ed",
                line_color: "#744210",
                month_text_color: "#c05621",
                finished_day_color: "#dd6b20"
            },
            {
                name: "Lavender Purple",
                background_color: "#faf5ff",
                line_color: "#553c9a",
                month_text_color: "#6b46c1",
                finished_day_color: "#8b5cf6"
            },
            {
                name: "Minimal Gray",
                background_color: "#f7fafc",
                line_color: "#2d3748",
                month_text_color: "#4a5568",
                finished_day_color: "#718096"
            }
        ]

        this.current_theme_index = 0

        this.setup_event_listeners()

        this.menu_click.onclick = (e) => {
            this.open_menu()
        }
    }

    setup_event_listeners = () => {
        // Checkbox management
        this.add_checkbox_btn.onclick = this.add_new_checkbox

        // Color changes
        this.background_color_input.onchange = () => this.update_color('background_color', this.background_color_input.value)
        this.line_color_input.onchange = () => this.update_color('line_color', this.line_color_input.value)
        this.month_text_color_input.onchange = () => this.update_color('month_text_color', this.month_text_color_input.value)
        this.finished_day_color_input.onchange = () => this.update_finished_day_color()

        // Other actions
        this.cycle_colors_btn.onclick = this.cycle_color_theme
        this.close_menu_btn.onclick = this.close_menu

        // Click capture area
        this.menu_click_capture.addEventListener('click', (e) => {
            e.stopPropagation()
            this.close_menu()
        })
    }

    add_new_checkbox = () => {
        const name = this.new_checkbox_name.value.trim()
        const color = this.new_checkbox_color.value

        if (name && !this.calendar_data.checkboxes[name]) {
            this.calendar_data.add_new_checkbox(name, color)
            this.new_checkbox_name.value = ''
            this.refresh_checkbox_list()
            this.save_and_sync()
            this.redraw()
        }
    }

    remove_checkbox = (checkbox_name) => {
        this.calendar_data.remove_checkbox(checkbox_name)
        this.refresh_checkbox_list()
        this.save_and_sync()
        this.redraw()
    }

    update_checkbox_color = (checkbox_name, new_color) => {
        this.calendar_data.checkboxes[checkbox_name] = new_color
        this.save_and_sync()
        this.redraw()
    }

    update_color = (color_type, new_color) => {
        this.calendar_data.visuals[color_type] = new_color
        this.save_and_sync()
        this.redraw()

        // Update menu background color if background_color changed
        if (color_type === 'background_color') {
            this.set_color(new_color)
        }

        // Switch to custom theme when user manually changes colors
        this.switch_to_custom_theme()
    }

    update_finished_day_color = () => {
        const color = this.finished_day_color_input.value
        // Apply a default alpha of 0.16 (16% transparency) to the selected color
        const rgba_color = this.hexToRgba(color, 0.16)
        this.calendar_data.visuals.finished_day_color = rgba_color
        this.save_and_sync()
        this.redraw()

        // Switch to custom theme when user manually changes colors
        this.switch_to_custom_theme()
    }

    cycle_color_theme = () => {
        // Move to next theme
        this.current_theme_index = (this.current_theme_index + 1) % this.color_themes.length
        const theme = this.color_themes[this.current_theme_index]

        // Handle custom theme differently
        if (theme.name === "Custom") {
            // Update custom theme with current colors
            this.update_custom_theme()
        } else {
            // Apply the predefined theme colors
            this.calendar_data.visuals.background_color = theme.background_color
            this.calendar_data.visuals.line_color = theme.line_color
            this.calendar_data.visuals.month_text_color = theme.month_text_color
            this.calendar_data.visuals.finished_day_color = this.hexToRgba(theme.finished_day_color, 0.16)

            // Save and redraw
            this.save_and_sync()
            this.redraw()
            this.set_color(theme.background_color)
        }

        // Update the input values to reflect the current theme
        this.load_current_colors()

        // Update title to show current theme
        this.update_colors_title(theme.name)
    }

    switch_to_custom_theme = () => {
        // Update custom theme with current colors
        this.update_custom_theme()

        // Switch to custom theme index
        this.current_theme_index = 0

        // Update title to show custom theme
        this.update_colors_title("Custom")
    }

    update_custom_theme = () => {
        // Update the custom theme with current visual settings
        const custom_theme = this.color_themes[0] // Custom is always first
        custom_theme.background_color = this.calendar_data.visuals.background_color || "#e8dec9"
        custom_theme.line_color = this.calendar_data.visuals.line_color || "#000000"
        custom_theme.month_text_color = this.calendar_data.visuals.month_text_color || "#166709"

        // Extract hex color from rgba finished_day_color
        const finished_day_color = this.calendar_data.visuals.finished_day_color || "rgba(103, 73, 9, 0.16)"
        custom_theme.finished_day_color = this.parseRgbaToHex(finished_day_color)
    }

    update_colors_title = (theme_name) => {
        this.colors_title.textContent = `Calendar Colors (${theme_name})`
    }

    hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (result) {
            const r = parseInt(result[1], 16)
            const g = parseInt(result[2], 16)
            const b = parseInt(result[3], 16)
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
        return `rgba(255, 255, 255, ${alpha})`
    }


    close_menu = () => {
        this.menu.style.display = "none"
        this.menu_click.style.display = "block"
        this.menu_click_capture.style.display = "none"
    }

    refresh_checkbox_list = () => {
        this.existing_checkboxes_div.innerHTML = ''

        Object.entries(this.calendar_data.checkboxes).forEach(([name, color]) => {
            const checkbox_item = document.createElement('div')
            checkbox_item.className = 'checkbox-item'
            checkbox_item.innerHTML = `
                <span class="checkbox-name">${name}</span>
                <input type="color" value="${color}" onchange="menu.update_checkbox_color('${name}', this.value)">
                <button onclick="menu.remove_checkbox('${name}')" class="remove-btn">×</button>
            `
            this.existing_checkboxes_div.appendChild(checkbox_item)
        })
    }

    load_current_colors = () => {
        if (this.calendar_data.visuals) {
            this.background_color_input.value = this.calendar_data.visuals.background_color || '#e8dec9'
            this.line_color_input.value = this.calendar_data.visuals.line_color || '#000000'
            this.month_text_color_input.value = this.calendar_data.visuals.month_text_color || '#166709'

            // Parse finished day color to get just the hex part
            const finished_day_color = this.calendar_data.visuals.finished_day_color || 'rgba(103, 73, 9, 0.16)'
            const hex = this.parseRgbaToHex(finished_day_color)
            this.finished_day_color_input.value = hex
        }
    }

    parseRgbaToHex = (rgba_string) => {
        // Try to parse rgba color
        const rgba_match = rgba_string.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        if (rgba_match) {
            const r = parseInt(rgba_match[1])
            const g = parseInt(rgba_match[2])
            const b = parseInt(rgba_match[3])
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
        }

        // Try to parse hex color
        const hex_match = rgba_string.match(/^#([a-f\d]{6})/)
        if (hex_match) {
            return '#' + hex_match[1]
        }

        // Default fallback
        return '#674909'
    }

    save_and_sync = () => {
        this.calendar_data.save_to_browser()
        if (this.gdrive_handler && this.gdrive_handler.access_token) {
            this.gdrive_handler.upload_json_string_to_file(this.calendar_data.save_to_jsons())
        }
    }

    set_redraw = f => {
        this.redraw_func = f
    }

    redraw = () => {
        if (this.redraw_func) {
            this.redraw_func()
        }
    }

    set_color = (background_color) => {
        this.color = background_color
        this.menu_click.style.backgroundColor = this.color
        // Menu background stays white/grey like day entry sidebar
        this.menu.style.backgroundColor = `rgba(255,255,255,0.9)`
    }

    hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ?
            parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) :
            '255,255,255'
    }

    open_menu = () => {
        this.refresh_checkbox_list()
        this.load_current_colors()

        // Initialize custom theme with current colors
        this.update_custom_theme()

        // Update title to show current theme
        const current_theme = this.color_themes[this.current_theme_index]
        this.update_colors_title(current_theme.name)

        this.menu_click.style.display = "none"
        this.menu.style.display = "block"
        this.menu_click_capture.style.display = "block"
    }
}



export {Menu}
