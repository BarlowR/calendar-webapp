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
    initialize_from_json = (json_path) => {
        return
    }
    initialize_new = (year) => {
        this.add_new_year(year)
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
}

export { CalendarData, month_name_mapping }
