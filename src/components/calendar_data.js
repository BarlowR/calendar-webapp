function calc_days_in_month(month, year) {
    // February
    if (month == 2){
        if (year % 4 == 0){ return 29; }
        return 28
    }
    
    // Months with 31 days
    if ((month == 1) ||
        (month == 3) ||
        (month == 5) ||
        (month == 7) ||
        (month == 8) ||
        (month == 10) ||
        (month == 12)){
        return 31
    }

    // Months with 30 days
    return 30
}

const month_name_mapping = {    1 :     "January", 
                                2 :     "February",
                                3 :     "March",
                                4 :     "April",
                                5 :     "May",
                                6 :     "June",
                                7 :     "July",
                                8 :     "August",
                                9 :     "September",
                                10 :    "October",
                                11 :    "November",
                                12 :    "December"}

class CalendarMonthData {
    constructor(month, year) {
        this.days = {}
        this.month = month
        this.days_in_month = calc_days_in_month(month, year)
        for (var day_index= 1; day_index < (this.days_in_month+1); day_index++){
            // No day object for now
            this.days[String(day_index)] = {"text": "", "checkboxes": []}
        }
    }
}

class CalendarYearData {
    constructor(year) {
        this.year = year
        this.months = {}
        for (var month_index= 1; month_index < 13; month_index++){
            this.months[String(month_index)] = new CalendarMonthData(month_index, year)
        }
    }
}

class CalendarData {
    constructor(){
        this.year_data = {}
        this.checkboxes = {}
    }
    initialize_from_jsons = (json_string) => {
        const json_obj = JSON.parse(json_string);
        // console.log(json_obj.year_data)
        if (!(json_obj.checkboxes && json_obj.year_data)){
            console.log("Bad data")
            return false;
        }
        this.year_data = json_obj.year_data
        this.checkboxes = json_obj.checkboxes
        return true
    }
    initialize_new = (year, checkboxes = {}) => {
        this.add_new_year(year)
        this.checkboxes = checkboxes
    }
    add_new_year = (year) => {
        this.year_data[year] = new CalendarYearData(year)
    }
    add_new_checkbox = (checkbox_name, color) => {
        this.checkboxes[checkbox_name] = color;
    }
    remove_checkbox = (checkbox_name) => {
        delete this.checkboxes[checkbox_name]
    }
    save_to_jsons = () => {
        return JSON.stringify(this)
    }
    save_to_browser = () => {
        localStorage["calendar_data"] = this.save_to_jsons()
    }
    load_from_browser = () => {
        const cal_data_string = localStorage.getItem("calendar_data")

        if (!(cal_data_string === null)){
            return this.initialize_from_jsons(cal_data_string)
        }
        
        console.log("Could not load from localStorage")
        return false
    }

    get_day_text = (year, month, day) => {
        const month_in_range = (Number(month) > 0 && Number(month) <= 12);
        const day_in_range = (Number(day) > 0 && Number(day) <= calc_days_in_month(Number(month), Number(year)));
        if (!(year in this.year_data) || !month_in_range || !day_in_range){
            console.log("value not in range")
            return
        }
        var day_to_edit = this.year_data[year].months[month].days[day]
        return day_to_edit["text"]
    }

    set_day_text = (year, month, day, new_text) => {
        const month_in_range = (Number(month) > 0 && Number(month) <= 12);
        const day_in_range = (Number(day) > 0 && Number(day) <= calc_days_in_month(Number(month), Number(year)));
        if (!month_in_range || !day_in_range){
            console.log("value not in range:")
            console.log(year, month, day)
            console.log(month_in_range, day_in_range)
            return
        }
        var day_to_edit = this.year_data[year].months[month].days[day]
        day_to_edit["text"] = new_text
    }

    get_day_checkboxes = (year, month, day, new_text) => {
        const month_in_range = (Number(month) > 0 && Number(month) <= 12);
        const day_in_range = (Number(day) > 0 && Number(day) <= calc_days_in_month(Number(month), Number(year)));
        if (!month_in_range || !day_in_range){
            console.log("value not in range:")
            console.log(year, month, day)
            console.log(month_in_range, day_in_range)
            return
        }
        var day_to_edit = this.year_data[year].months[month].days[day]
        return day_to_edit["checkboxes"]
    }

    set_day_checkboxes = (year, month, day, new_checkbox_list) => {
        const month_in_range = (Number(month) > 0 && Number(month) <= 12);
        const day_in_range = (Number(day) > 0 && Number(day) <= calc_days_in_month(Number(month), Number(year)));
        if (!month_in_range || !day_in_range){
            console.log("value not in range:")
            console.log(year, month, day)
            console.log(month_in_range, day_in_range)
            return
        }
        var day_to_edit = this.year_data[year].months[month].days[day]
        day_to_edit["checkboxes"] = new_checkbox_list
    }
}

export { CalendarData, month_name_mapping }
